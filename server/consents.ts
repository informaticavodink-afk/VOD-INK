import { createServiceClient } from './supabase.js';
import { uploadToDrive } from './drive.js';
import { generateConsentPDF } from '../src/lib/pdf.js';
import type { WizardState } from '../src/types';
import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';

const LOCAL_PDFS_DIR = path.join(process.cwd(), 'data', 'pdfs');

function sha256Hex(input: Buffer | string) {
  return createHash('sha256').update(input).digest('hex');
}

function getClientSigner(state: WizardState) {
  return state.esMenor
    ? {
        signerType: 'representative' as const,
        signerName: state.datosRepresentante.nombreYApellidos,
        signature: state.firmaCliente,
      }
    : {
        signerType: 'client' as const,
        signerName: state.datosCliente.nombreYApellidos,
        signature: state.firmaCliente,
      };
}

// Local disk write — optional backup, silently skipped in serverless environments
try {
  if (!fs.existsSync(LOCAL_PDFS_DIR)) {
    fs.mkdirSync(LOCAL_PDFS_DIR, { recursive: true });
  }
} catch {
  // Silently skip — read-only filesystem in serverless environments
}

export interface SubmitConsentPayload {
  state: WizardState;
  pdfBase64: string;
  fileName: string;
  idempotencyKey: string;
  driveAccessToken?: string;
}

export interface SubmitConsentResult {
  consentId: string;
  status: 'signed' | 'pending_technique' | 'pending_artist' | 'upload_error';
  storagePath: string;
  driveFileId: string | null;
  driveViewLink: string | null;
}

export async function submitConsentToSupabase(
  payload: SubmitConsentPayload
): Promise<SubmitConsentResult> {
  const { state, pdfBase64, fileName, idempotencyKey, driveAccessToken } = payload;
  const hasArtistSignature = typeof state.firmaAplicador === 'string' && state.firmaAplicador.startsWith('data:image/');
  console.log('[DEBUG] state.artistaSeleccionado en backend:', JSON.stringify(state.artistaSeleccionado, null, 2));
  const supabase = createServiceClient();

  const artistId = state.artistaSeleccionado?.id;
  if (!artistId) {
    throw new Error('No se ha seleccionado un tatuador');
  }

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, studio_id, full_name, drive_folder_id, status')
    .eq('id', artistId)
    .single();

  if (artistError) {
    throw new Error(`Error en base de datos al buscar tatuador: ${artistError.message} (${artistError.code})`);
  }

  if (!artist) {
    throw new Error('Tatuador no encontrado');
  }

  if (artist.status !== 'active') {
    throw new Error('El tatuador seleccionado no está activo');
  }

  const studioId = artist.studio_id;

  const { data: existingConsent } = await supabase
    .from('consents')
    .select('id, status')
    .eq('studio_id', studioId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

      if (existingConsent) {
    return {
      consentId: existingConsent.id,
      status: existingConsent.status as 'signed' | 'pending_technique' | 'pending_artist' | 'upload_error',
      storagePath: `studios/${studioId}/artists/${artist.id}/${existingConsent.id}/client-signed.pdf`,
      driveFileId: null,
      driveViewLink: null,
    };
  }

  const { data: consent, error: consentError } = await supabase
    .from('consents')
    .insert({
      studio_id: studioId,
      artist_id: artist.id,
      client_full_name: state.datosCliente.nombreYApellidos,
      client_dni: state.datosCliente.dni,
      client_birth_date: state.datosCliente.fechaNacimiento || null,
      client_phone: state.datosCliente.telefono || null,
      client_address: state.datosCliente.domicilio || null,
      client_postal_code: state.datosCliente.cp || null,
      client_city: state.datosCliente.localidad || null,
      is_minor: state.esMenor,
      representative_full_name: state.esMenor ? state.datosRepresentante.nombreYApellidos : null,
      representative_dni: state.esMenor ? state.datosRepresentante.dni : null,
      representative_birth_date: state.esMenor ? state.datosRepresentante.fechaNacimiento : null,
      representative_phone: state.esMenor ? state.datosRepresentante.telefono : null,
      representative_address: state.esMenor ? state.datosRepresentante.domicilio : null,
      representative_postal_code: state.esMenor ? state.datosRepresentante.cp : null,
      representative_city: state.esMenor ? state.datosRepresentante.localidad : null,
      representative_relationship: state.esMenor ? state.datosRepresentante.parentesco : null,
      representative_accreditation: state.esMenor ? state.datosRepresentante.acreditaMediante : null,
      health_flags: state.declaracionSaludSeleccionadas,
      technique_data: state.datosTecnica as unknown as import('../src/types/supabase').Json,
      legal_acceptance: {
        declaracionLeido: state.declaracionLeido,
        confirmadoPrecio: state.confirmadoPrecio,
        lugar: state.lugar,
        fecha: state.fecha,
        firmaCliente: state.firmaCliente, // Save client's signature base64!
      },
      signed_at: hasArtistSignature ? new Date().toISOString() : null, // Only fully signed when artist signs
      status: hasArtistSignature ? 'signed' : 'pending_technique',
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();

  if (consentError || !consent) {
    throw new Error(`Error al guardar el consentimiento: ${consentError?.message || 'desconocido'}`);
  }

  const storagePath = `studios/${studioId}/artists/${artist.id}/${consent.id}/client-signed.pdf`;
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  const pdfSha256 = sha256Hex(pdfBuffer);
  const clientSigner = getClientSigner(state);

  const { error: uploadError } = await supabase.storage
    .from('consent-pdfs')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  let status: 'signed' | 'pending_technique' | 'pending_artist' | 'upload_error' = hasArtistSignature ? 'signed' : 'pending_technique';
  let driveFileId: string | null = null;
  let driveViewLink: string | null = null;

  if (uploadError) {
    status = 'upload_error';
    await supabase.from('consents').update({ status: 'upload_error' }).eq('id', consent.id);
  } else {
      const { error: fileRecordError } = await supabase.from('consent_files').insert({
      consent_id: consent.id,
      studio_id: studioId,
      artist_id: artist.id,
      storage_path: storagePath,
      file_name: fileName,
      size_bytes: pdfBuffer.length,
      sha256: pdfSha256,
    });

    if (fileRecordError) {
      console.error('Error registrando consent_files:', fileRecordError);
    }

    if (clientSigner.signature?.startsWith('data:image/')) {
      const { error: signatureError } = await supabase.from('consent_signatures').upsert(
        {
          consent_id: consent.id,
          studio_id: studioId,
          artist_id: artist.id,
          signer_type: clientSigner.signerType,
          signer_name: clientSigner.signerName,
          signature_hash: sha256Hex(clientSigner.signature),
          metadata: {
            source: 'public_wizard',
            storage_path: storagePath,
          },
        },
        { onConflict: 'consent_id,signer_type' }
      );

      if (signatureError) {
        console.error('Error registrando consent_signatures:', signatureError);
      }
    }

    if (driveAccessToken && artist.drive_folder_id) {
      try {
        const driveResult = await uploadToDrive({
          pdfBase64,
          fileName,
          carpetaDriveId: artist.drive_folder_id,
          accessToken: driveAccessToken,
        });
        driveFileId = driveResult.driveFileId;
        driveViewLink = driveResult.driveViewLink;

        if (driveFileId) {
          await supabase
            .from('consent_files')
            .update({ drive_file_id: driveFileId, drive_view_link: driveViewLink })
            .eq('consent_id', consent.id);
        }
      } catch (driveErr) {
        console.error('Error al subir a Google Drive:', driveErr);
      }
    }
  }

  return { consentId: consent.id, status, storagePath, driveFileId, driveViewLink } as SubmitConsentResult;
}

export async function generateAndSubmitConsent(
  state: WizardState,
  idempotencyKey: string,
  driveAccessToken?: string
): Promise<SubmitConsentResult> {
  const { base64, fileName } = await generateConsentPDF(state);

  // Local emergency backup always written before Supabase upload
  const localFilePath = path.join(LOCAL_PDFS_DIR, fileName);
  try {
    fs.writeFileSync(localFilePath, Buffer.from(base64, 'base64'));
  } catch (localErr) {
    console.error('Error al guardar backup local del PDF:', localErr);
  }

  return submitConsentToSupabase({
    state,
    pdfBase64: base64,
    fileName,
    idempotencyKey,
    driveAccessToken,
  });
}

export async function signConsentAsArtist(
  consentId: string,
  artistSignature: string,
  driveAccessToken?: string
): Promise<SubmitConsentResult> {
  const supabase = createServiceClient();

  // 1. Fetch the consent
  const { data: consent, error: fetchError } = await supabase
    .from('consents')
    .select('*')
    .eq('id', consentId)
    .single();

  if (fetchError || !consent) {
    throw new Error('Consentimiento no encontrado');
  }

  // 2. Fetch the artist
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('id', consent.artist_id)
    .single();

  if (artistError || !artist) {
    throw new Error('Tatuador no encontrado');
  }

  if (consent.status === 'signed') {
    throw new Error('El consentimiento ya está firmado');
  }

  const legalAcceptance = consent.legal_acceptance as any;
  const clientSignature = legalAcceptance.firmaCliente || '';

  // 3. Reconstruct WizardState
  const state: WizardState = {
    pasoActual: 4,
    artistaSeleccionado: {
      id: artist.id,
      nombreYApellidos: artist.full_name,
      titulacion: artist.qualification,
      dni: artist.dni,
      fotoUrl: artist.photo_url || '',
      carpetaDriveId: artist.drive_folder_id || '',
    },
    datosCliente: {
      nombreYApellidos: consent.client_full_name,
      dni: consent.client_dni,
      fechaNacimiento: consent.client_birth_date || '',
      domicilio: consent.client_address || '',
      cp: consent.client_postal_code || '',
      localidad: consent.client_city || '',
      telefono: consent.client_phone || '',
    },
    esMenor: consent.is_minor,
    datosRepresentante: {
      nombreYApellidos: consent.representative_full_name || '',
      dni: consent.representative_dni || '',
      fechaNacimiento: consent.representative_birth_date || '',
      domicilio: consent.representative_address || '',
      cp: consent.representative_postal_code || '',
      localidad: consent.representative_city || '',
      telefono: consent.representative_phone || '',
      parentesco: consent.representative_relationship || '',
      acreditaMediante: consent.representative_accreditation || '',
    },
    datosTecnica: consent.technique_data as any,
    declaracionLeido: legalAcceptance.declaracionLeido || false,
    declaracionContraindicaciones: true,
    declaracionSaludSeleccionadas: consent.health_flags as string[],
    confirmadoPrecio: legalAcceptance.confirmadoPrecio || false,
    firmaCliente: clientSignature,
    firmaAplicador: artistSignature, // Save the new artist signature
    lugar: legalAcceptance.lugar || 'Santander',
    fecha: legalAcceptance.fecha || new Date().toLocaleDateString('es-ES'),
  };

  // 4. Regenerate PDF
  const { base64, fileName } = await generateConsentPDF(state);

  // Write emergency local backup
  const localFilePath = path.join(LOCAL_PDFS_DIR, fileName);
  try {
    fs.writeFileSync(localFilePath, Buffer.from(base64, 'base64'));
  } catch (localErr) {
    console.error('Error al guardar backup local del PDF firmado:', localErr);
  }

  // 5. Update consents table status and legal_acceptance JSON
  const updatedLegalAcceptance = {
    ...legalAcceptance,
    firmaAplicador: artistSignature,
  };

  const { error: updateError } = await supabase
    .from('consents')
    .update({
      status: 'signed',
      legal_acceptance: updatedLegalAcceptance,
      signed_at: new Date().toISOString(),
    })
    .eq('id', consentId);

  if (updateError) {
    throw new Error(`Error al actualizar el estado del consentimiento: ${updateError.message}`);
  }

  // 6. Store the final PDF in an immutable phase-specific path
  const storagePath = `studios/${consent.studio_id}/artists/${artist.id}/${consent.id}/artist-signed.pdf`;
  const pdfBuffer = Buffer.from(base64, 'base64');
  const pdfSha256 = sha256Hex(pdfBuffer);

  const { error: uploadError } = await supabase.storage
    .from('consent-pdfs')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  let status: 'signed' | 'pending_artist' | 'upload_error' = 'signed';
  let driveFileId: string | null = null;
  let driveViewLink: string | null = null;

  if (uploadError) {
    console.error('Error al subir PDF firmado a Supabase storage:', uploadError);
    status = 'upload_error';
    await supabase.from('consents').update({ status: 'upload_error' }).eq('id', consentId);
  } else {
      // Insert a new file metadata row for the final signed PDF.
      const { error: fileRecordError } = await supabase.from('consent_files').insert({
      consent_id: consentId,
      studio_id: consent.studio_id,
      artist_id: artist.id,
      storage_path: storagePath,
      file_name: fileName,
      size_bytes: pdfBuffer.length,
      sha256: pdfSha256,
    });

    if (fileRecordError) {
      console.error('Error registrando consent_files firmado:', fileRecordError);
    }

    const { error: signatureError } = await supabase.from('consent_signatures').upsert(
      {
        consent_id: consentId,
        studio_id: consent.studio_id,
        artist_id: artist.id,
        signer_type: 'artist',
        signer_name: artist.full_name,
        signature_hash: sha256Hex(artistSignature),
        metadata: {
          source: 'artist_panel',
          storage_path: storagePath,
        },
      },
      { onConflict: 'consent_id,signer_type' }
    );

    if (signatureError) {
      console.error('Error registrando firma del artista:', signatureError);
    }

    // 7. Upload to Google Drive if active
    if (driveAccessToken && artist.drive_folder_id) {
      try {
        const driveResult = await uploadToDrive({
          pdfBase64: base64,
          fileName,
          carpetaDriveId: artist.drive_folder_id,
          accessToken: driveAccessToken,
        });
        driveFileId = driveResult.driveFileId;
        driveViewLink = driveResult.driveViewLink;

            if (driveFileId) {
          await supabase
            .from('consent_files')
            .update({ drive_file_id: driveFileId, drive_view_link: driveViewLink })
            .eq('storage_path', storagePath);
        }
      } catch (driveErr) {
        console.error('Error al subir PDF firmado a Google Drive:', driveErr);
      }
    }
  }

  return { consentId: consent.id, status, storagePath, driveFileId, driveViewLink };
}

export async function saveConsentTechnique(
  consentId: string,
  techniqueData: any
): Promise<{ success: boolean; status: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('consents')
    .update({
      technique_data: techniqueData,
      status: 'pending_artist'
    })
    .eq('id', consentId);

  if (error) {
    throw new Error(`Error al guardar los datos de intervención: ${error.message}`);
  }

  return { success: true, status: 'pending_artist' };
}

export async function cancelConsentAsArtist(
  consentId: string
): Promise<{ success: boolean; status: 'cancelled' }> {
  const supabase = createServiceClient();

  const { data: consent, error: fetchError } = await supabase
    .from('consents')
    .select('id, studio_id, artist_id, status')
    .eq('id', consentId)
    .single();

  if (fetchError || !consent) {
    throw new Error('Consentimiento no encontrado');
  }

  if (consent.status === 'signed') {
    throw new Error('No se puede descartar un consentimiento ya firmado');
  }

  if (consent.status === 'cancelled') {
    return { success: true, status: 'cancelled' };
  }

  const { error: updateError } = await supabase
    .from('consents')
    .update({ status: 'cancelled' })
    .eq('id', consentId);

  if (updateError) {
    throw new Error(`Error al descartar el consentimiento: ${updateError.message}`);
  }

  const { error: auditError } = await supabase.from('audit_logs').insert({
    studio_id: consent.studio_id,
    artist_id: consent.artist_id,
    consent_id: consent.id,
    action: 'consent_cancelled_by_artist',
    metadata: {
      previous_status: consent.status,
      source: 'artist_panel',
    },
  });

  if (auditError) {
    console.error('Error registrando auditoría del descarte de consentimiento:', auditError);
  }

  return { success: true, status: 'cancelled' };
}
