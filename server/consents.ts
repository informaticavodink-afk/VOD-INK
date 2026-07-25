import { createServiceClient } from './supabase.js';
import { uploadToDrive } from './drive.js';
import { generateConsentPDF } from '../src/lib/pdf.js';
import { ClientSchema, RepresentanteSchema } from '../src/lib/schema.js';
import { getArtistConsentForUser } from './artistConsent.js';
export { saveConsentTechnique } from './artistConsent.js';
import { buildConsentPdfData, createDocumentSnapshot } from './consentPdfData.js';
import type { WizardState } from '../src/types';
import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';

const LOCAL_PDFS_DIR = path.join(process.cwd(), 'data', 'pdfs');

export interface SubmitConsentResult {
  consentId: string;
  status: 'signed' | 'pending_technique' | 'pending_artist' | 'upload_error';
  storagePath: string;
  driveFileId: string | null;
  driveViewLink: string | null;
}

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

export async function generateAndSubmitConsent(
  state: WizardState,
  idempotencyKey: string,
  _driveAccessToken?: string
): Promise<SubmitConsentResult> {
  ClientSchema.parse(state.datosCliente);
  if (state.esMenor) RepresentanteSchema.parse(state.datosRepresentante);
  if (!state.declaracionLeido || !state.declaracionContraindicaciones) {
    throw new Error('Las declaraciones legales obligatorias no están aceptadas');
  }
  if (!/^data:image\/png;base64,iVBORw0KGgo/.test(state.firmaCliente)) {
    throw new Error('La firma del cliente no es una imagen PNG válida');
  }

  const supabase = createServiceClient();
  const artistId = state.artistaSeleccionado?.id;
  if (!artistId) throw new Error('No se ha seleccionado un tatuador');

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, studio_id, full_name, status')
    .eq('id', artistId)
    .single();

  if (artistError || !artist || artist.status !== 'active') {
    throw new Error('El tatuador seleccionado no existe o no está activo');
  }

  const { data: existing } = await supabase
    .from('consents')
    .select('id, status, final_file_id')
    .eq('studio_id', artist.studio_id)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existing) {
    return {
      consentId: existing.id,
      status: existing.status as SubmitConsentResult['status'],
      storagePath: '',
      driveFileId: null,
      driveViewLink: null,
    };
  }

  const legalAcceptance = {
    declaracionLeido: state.declaracionLeido,
    confirmadoPrecio: state.confirmadoPrecio,
    lugar: state.lugar,
    fecha: state.fecha,
    firmaCliente: state.firmaCliente,
  };

  const { data: consent, error: consentError } = await supabase
    .from('consents')
    .insert({
      studio_id: artist.studio_id,
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
      technique_data: {},
      legal_acceptance: legalAcceptance,
      status: 'pending_technique',
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();

  if (consentError || !consent) {
    throw new Error(`Error al guardar el consentimiento: ${consentError?.message || 'desconocido'}`);
  }

  const clientSigner = getClientSigner(state);
  const { error: signatureError } = await supabase.from('consent_signatures').upsert(
    {
      consent_id: consent.id,
      studio_id: artist.studio_id,
      artist_id: artist.id,
      signer_type: clientSigner.signerType,
      signer_name: clientSigner.signerName,
      signature_hash: sha256Hex(clientSigner.signature),
      metadata: { source: 'public_wizard' },
    },
    { onConflict: 'consent_id,signer_type' }
  );

  if (signatureError) {
    await supabase.from('consents').delete().eq('id', consent.id);
    throw new Error(`Error al registrar la firma del cliente: ${signatureError.message}`);
  }

  return {
    consentId: consent.id,
    status: 'pending_technique',
    storagePath: '',
    driveFileId: null,
    driveViewLink: null,
  };
}

export async function signConsentAsArtist(
  consentId: string,
  artistSignature: string,
  actorUserId: string,
  driveAccessToken?: string
): Promise<SubmitConsentResult> {
  const { supabase, consent, artist } = await getArtistConsentForUser(consentId, actorUserId);

  if (consent.status === 'signed' && consent.final_file_id) {
    const { data: finalFile } = await supabase
      .from('consent_files')
      .select('storage_path, drive_file_id, drive_view_link')
      .eq('id', consent.final_file_id)
      .single();
    if (!finalFile) throw new Error('El consentimiento firmado no tiene un archivo final válido');
    return {
      consentId,
      status: 'signed',
      storagePath: finalFile.storage_path,
      driveFileId: finalFile.drive_file_id,
      driveViewLink: finalFile.drive_view_link,
    };
  }

  if (consent.status !== 'pending_artist' && consent.status !== 'upload_error') {
    throw new Error('Este consentimiento no está preparado para su firma final');
  }

  let finalizationStartedAt = consent.finalization_started_at;
  if (!finalizationStartedAt) {
    const candidate = new Date().toISOString();
    const { data: claimed } = await supabase
      .from('consents')
      .update({ finalization_started_at: candidate })
      .eq('id', consentId)
      .is('finalization_started_at', null)
      .select('finalization_started_at')
      .maybeSingle();

    if (claimed?.finalization_started_at) {
      finalizationStartedAt = claimed.finalization_started_at;
    } else {
      const { data: current } = await supabase
        .from('consents')
        .select('finalization_started_at')
        .eq('id', consentId)
        .single();
      finalizationStartedAt = current?.finalization_started_at ?? null;
    }
  }
  if (!finalizationStartedAt) throw new Error('No se pudo iniciar la finalización del documento');

  const { data: studio, error: studioError } = await supabase
    .from('studios')
    .select('*')
    .eq('id', consent.studio_id)
    .single();
  if (studioError || !studio) throw new Error('No se encontraron los datos del establecimiento');

  const finalizedAt = new Date(finalizationStartedAt);
  const document = buildConsentPdfData({ consent, artist, studio, artistSignature, generatedAt: finalizedAt });
  const { base64, fileName } = await generateConsentPDF(document);
  const pdfBuffer = Buffer.from(base64, 'base64');
  const pdfSha256 = sha256Hex(pdfBuffer);
  const storagePath = `studios/${consent.studio_id}/artists/${artist.id}/${consent.id}/final/${pdfSha256}.pdf`;

  try {
    fs.writeFileSync(path.join(LOCAL_PDFS_DIR, fileName), pdfBuffer);
  } catch (localErr) {
    console.error('Error al guardar el respaldo local del PDF final:', localErr instanceof Error ? localErr.message : localErr);
  }

  const { data: existingFinal } = await supabase
    .from('consent_files')
    .select('id, storage_path, sha256, drive_file_id, drive_view_link')
    .eq('consent_id', consentId)
    .eq('document_kind', 'final')
    .maybeSingle();

  if (existingFinal && existingFinal.sha256 !== pdfSha256) {
    throw new Error('El consentimiento ya tiene un documento final con contenido diferente');
  }

  let finalFile = existingFinal;
  if (!finalFile) {
    const { error: uploadError } = await supabase.storage
      .from('consent-pdfs')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false });

    const isExistingObject = uploadError && /already exists|duplicate|resource already exists/i.test(uploadError.message);
    if (uploadError && !isExistingObject) {
      await supabase.from('consents').update({ status: 'upload_error' }).eq('id', consentId);
      throw new Error(`No se pudo almacenar el PDF final: ${uploadError.message}`);
    }

    const { data: insertedFile, error: fileError } = await supabase
      .from('consent_files')
      .insert({
        consent_id: consentId,
        studio_id: consent.studio_id,
        artist_id: artist.id,
        document_kind: 'final',
        storage_path: storagePath,
        file_name: fileName,
        size_bytes: pdfBuffer.length,
        sha256: pdfSha256,
      })
      .select('id, storage_path, sha256, drive_file_id, drive_view_link')
      .single();

    if (fileError || !insertedFile) {
      const { data: reconciledFile } = await supabase
        .from('consent_files')
        .select('id, storage_path, sha256, drive_file_id, drive_view_link')
        .eq('consent_id', consentId)
        .eq('document_kind', 'final')
        .eq('sha256', pdfSha256)
        .maybeSingle();
      if (!reconciledFile) {
        await supabase.from('consents').update({ status: 'upload_error' }).eq('id', consentId);
        throw new Error(`No se pudo registrar el PDF final: ${fileError?.message || 'desconocido'}`);
      }
      finalFile = reconciledFile;
    } else {
      finalFile = insertedFile;
    }
  }

  const { error: signatureError } = await supabase.from('consent_signatures').upsert(
    {
      consent_id: consentId,
      studio_id: consent.studio_id,
      artist_id: artist.id,
      signer_type: 'artist',
      signer_name: artist.full_name,
      signature_hash: sha256Hex(artistSignature),
      metadata: { source: 'artist_panel', storage_path: finalFile.storage_path },
    },
    { onConflict: 'consent_id,signer_type' }
  );
  if (signatureError) throw new Error(`No se pudo registrar la firma del tatuador: ${signatureError.message}`);

  const legalAcceptance = consent.legal_acceptance as Record<string, unknown>;
  const { error: updateError } = await supabase
    .from('consents')
    .update({
      status: 'signed',
      legal_acceptance: { ...legalAcceptance, firmaAplicador: artistSignature },
      document_snapshot: createDocumentSnapshot(document),
      document_template_version: document.templateVersion,
      final_file_id: finalFile.id,
      finalized_at: finalizedAt.toISOString(),
      signed_at: finalizedAt.toISOString(),
    })
    .eq('id', consentId)
    .in('status', ['pending_artist', 'upload_error']);
  if (updateError) throw new Error(`No se pudo finalizar el consentimiento: ${updateError.message}`);

  let driveFileId = finalFile.drive_file_id;
  let driveViewLink = finalFile.drive_view_link;
  if (driveAccessToken && artist.drive_folder_id && !driveFileId) {
    try {
      const driveResult = await uploadToDrive({
        pdfBase64: base64,
        fileName,
        carpetaDriveId: artist.drive_folder_id,
        accessToken: driveAccessToken,
      });
      driveFileId = driveResult.driveFileId;
      driveViewLink = driveResult.driveViewLink;
      await supabase.from('consent_files')
        .update({ drive_file_id: driveFileId, drive_view_link: driveViewLink })
        .eq('id', finalFile.id);
    } catch (driveErr) {
      console.error('Error al copiar el PDF final a Google Drive:', driveErr instanceof Error ? driveErr.message : driveErr);
    }
  }

  return { consentId, status: 'signed', storagePath: finalFile.storage_path, driveFileId, driveViewLink };
}

export async function cancelConsentAsArtist(
  consentId: string,
  actorUserId: string
): Promise<{ success: boolean; status: 'cancelled' }> {
  const { supabase, consent } = await getArtistConsentForUser(consentId, actorUserId);

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
