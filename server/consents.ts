import { createServiceClient } from "./supabase.js";
import { resolveAvailablePublicArtist } from "./publicArtists.js";
import { resolvePublicStudio } from "./publicStudio.js";
import { uploadToDrive } from "./drive.js";
import { generateConsentPDF } from "../src/lib/pdf.js";
import { ClientSchema, RepresentanteSchema } from "../src/lib/schema.js";
import { isMinorOnConsentDate } from "../src/domain/consents/age.js";
import type { RepresentanteLegal } from "../src/types.js";
import { getArtistConsentForUser } from "./artistConsent.js";
export { saveConsentTechnique } from "./artistConsent.js";
import {
	buildConsentPdfData,
	createDocumentSnapshot,
} from "./consentPdfData.js";
import type { WizardState } from "../src/types.js";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";

const LOCAL_PDFS_DIR = path.join(process.cwd(), "data", "pdfs");

export interface SubmitConsentResult {
	consentId: string;
	status: "signed" | "pending_technique" | "pending_artist" | "upload_error";
	storagePath: string;
	driveFileId: string | null;
	driveViewLink: string | null;
}

    function sha256Hex(input: Buffer | string) {
     return createHash("sha256").update(input).digest("hex");
    }

    export const STUDIO_HEALTH_UNVERIFIED_MESSAGE =
     "Faltan datos sanitarios verificados del estudio. Solicita su actualización y vuelve a intentar finalizar este mismo consentimiento.";

    const FINALIZATION_ERROR_DEFINITIONS = {
     STUDIO_HEALTH_UNVERIFIED: {
      status: 409,
      message: STUDIO_HEALTH_UNVERIFIED_MESSAGE,
      retryable: true,
     },
     FINALIZATION_CONTENT_CONFLICT: {
      status: 409,
      message: "El consentimiento ya tiene un documento final con contenido diferente.",
      retryable: false,
     },
     FINALIZATION_RETRYABLE: {
      status: 503,
      message: "No se pudo completar la finalización del consentimiento. Vuelve a intentarlo.",
      retryable: true,
     },
    } as const;

    export type FinalizationErrorCode = keyof typeof FINALIZATION_ERROR_DEFINITIONS;

    export class FinalizationError extends Error {
     readonly status: number;
     readonly retryable: boolean;

     constructor(readonly code: FinalizationErrorCode, message?: string) {
      const definition = FINALIZATION_ERROR_DEFINITIONS[code];
      super(message ?? definition.message);
      this.name = "FinalizationError";
      this.status = definition.status;
      this.retryable = definition.retryable;
     }
    }

    export function toFinalizationErrorEnvelope(error: unknown) {
     if (!(error instanceof FinalizationError)) return null;
     return {
      status: error.status,
      body: {
       error: {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
       },
      },
     };
    }

    export function assertStudioHealthVerified(studio: {
     health_registration_number?: string | null;
     health_authorization_date?: string | null;
     health_data_verified_at?: string | null;
    }) {
     const registration = studio.health_registration_number?.trim();
     const isDemoPair =
      studio.health_registration_number === "SAN/07/2024-C" &&
      studio.health_authorization_date === "2024-06-15";
     if (
      !registration ||
      !studio.health_authorization_date ||
      !studio.health_data_verified_at ||
      isDemoPair
     ) {
      throw new FinalizationError("STUDIO_HEALTH_UNVERIFIED");
     }
    }

    export function deriveConsentRepresentation(
	state: Pick<WizardState, "esMenor" | "tieneRepresentanteLegal" | "datosCliente"> | { fechaNacimiento: string; esMenor?: boolean; tieneRepresentanteLegal?: boolean },
	consentDate?: string | Date,
) {
	const birthDate = "datosCliente" in state ? state.datosCliente.fechaNacimiento : state.fechaNacimiento;
	const isMinor = isMinorOnConsentDate(birthDate, consentDate);
	if (typeof state.esMenor === "boolean" && state.esMenor !== isMinor) {
		throw new Error("La clasificación de edad del navegador no coincide con la edad derivada");
	}
	const represented = state.tieneRepresentanteLegal === true;
	if (isMinor && !represented) throw new Error("Los menores requieren representación legal");
	return { isMinor, represented };
}

export function buildRepresentativePersistence(represented: boolean, representative?: RepresentanteLegal) {
	if (!represented) return {
		representative_full_name: null, representative_dni: null, representative_birth_date: null,
		representative_phone: null, representative_address: null, representative_postal_code: null,
		representative_city: null, representative_relationship: null, representative_accreditation: null,
	};
	if (!representative) throw new Error("La representación requiere datos completos");
	const validatedRepresentative = RepresentanteSchema.parse(representative);
	return {
		representative_full_name: validatedRepresentative.nombreYApellidos, representative_dni: validatedRepresentative.dni,
		representative_birth_date: validatedRepresentative.fechaNacimiento, representative_phone: validatedRepresentative.telefono,
		representative_address: validatedRepresentative.domicilio, representative_postal_code: validatedRepresentative.cp,
		representative_city: validatedRepresentative.localidad, representative_relationship: validatedRepresentative.parentesco,
		representative_accreditation: validatedRepresentative.acreditaMediante,
	};
}

export function getPublicConsentSigner(
	representative: RepresentanteLegal,
	signature: string,
	represented: boolean,
	clientName = "",
) {
	return represented
		? { signerType: "representative" as const, signerName: representative.nombreYApellidos, signature }
		: { signerType: "client" as const, signerName: clientName, signature };
}

function getClientSigner(state: WizardState, represented: boolean) {
	return getPublicConsentSigner(
		state.datosRepresentante,
		state.firmaCliente,
		represented,
		state.datosCliente.nombreYApellidos,
	);
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
	_driveAccessToken?: string,
): Promise<SubmitConsentResult> {
	ClientSchema.parse(state.datosCliente);
	const representation = deriveConsentRepresentation(state);
	if (representation.represented) RepresentanteSchema.parse(state.datosRepresentante);
	if (!state.declaracionLeido || !state.declaracionContraindicaciones) {
		throw new Error(
			"Las declaraciones legales obligatorias no están aceptadas",
		);
	}
	if (!/^data:image\/png;base64,iVBORw0KGgo/.test(state.firmaCliente)) {
		throw new Error("La firma del cliente no es una imagen PNG válida");
	}

	const supabase = createServiceClient();
	const artistId = state.artistaSeleccionado?.id;
	if (!artistId) throw new Error("No se ha seleccionado un tatuador");

	const studio = await resolvePublicStudio(supabase);
	const artist = await resolveAvailablePublicArtist(
		supabase,
		studio.id,
		artistId,
	);

	const { data: existing } = await supabase
		.from("consents")
		.select("id, status, final_file_id")
		.eq("studio_id", studio.id)
		.eq("idempotency_key", idempotencyKey)
		.maybeSingle();

	if (existing) {
		return {
			consentId: existing.id,
			status: existing.status as SubmitConsentResult["status"],
			storagePath: "",
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
		.from("consents")
		.insert({
			studio_id: studio.id,
			artist_id: artist.id,
			client_full_name: state.datosCliente.nombreYApellidos,
			client_dni: state.datosCliente.dni,
			client_birth_date: state.datosCliente.fechaNacimiento || null,
			client_phone: state.datosCliente.telefono || null,
			client_address: state.datosCliente.domicilio || null,
			client_postal_code: state.datosCliente.cp || null,
			client_city: state.datosCliente.localidad || null,
			is_minor: representation.isMinor,
			has_legal_representative: representation.represented,
			...buildRepresentativePersistence(representation.represented, state.datosRepresentante),
			health_flags: state.declaracionSaludSeleccionadas,
			technique_data: {},
			legal_acceptance: legalAcceptance,
			status: "pending_technique",
			idempotency_key: idempotencyKey,
		})
		.select("id")
		.single();

	if (consentError || !consent) {
		throw new Error(
			`Error al guardar el consentimiento: ${consentError?.message || "desconocido"}`,
		);
	}

	const clientSigner = getClientSigner(state, representation.represented);
	const { error: signatureError } = await supabase
		.from("consent_signatures")
		.upsert(
			{
				consent_id: consent.id,
				studio_id: studio.id,
				artist_id: artist.id,
				signer_type: clientSigner.signerType,
				signer_name: clientSigner.signerName,
				signature_hash: sha256Hex(clientSigner.signature),
				metadata: { source: "public_wizard" },
			},
			{ onConflict: "consent_id,signer_type" },
		);

	if (signatureError) {
		await supabase.from("consents").delete().eq("id", consent.id);
		throw new Error(
			`Error al registrar la firma del cliente: ${signatureError.message}`,
		);
	}

	return {
		consentId: consent.id,
		status: "pending_technique",
		storagePath: "",
		driveFileId: null,
		driveViewLink: null,
	};
}

    export const DRIVE_COPY_CLAIM_TTL_MS = 5 * 60 * 1000;

    type FinalFileRecord = {
     id: string;
     storage_path: string;
     file_name: string;
     sha256: string | null;
     drive_file_id: string | null;
     drive_view_link: string | null;
     drive_copy_claimed_at?: string | null;
     drive_copy_completed_at?: string | null;
    };

    const FINAL_FILE_COLUMNS =
     "id, storage_path, file_name, sha256, drive_file_id, drive_view_link, drive_copy_claimed_at, drive_copy_completed_at";

    function retryableFinalization(message: string) {
     return new FinalizationError("FINALIZATION_RETRYABLE", message);
    }

    async function claimFinalizationStart(
     supabase: any,
     consentId: string,
     current?: string | null,
    ) {
     if (current) return current;
     const candidate = new Date().toISOString();
     const { data: claimed, error: claimError } = await supabase
      .from("consents")
      .update({ finalization_started_at: candidate })
      .eq("id", consentId)
      .is("finalization_started_at", null)
      .select("finalization_started_at")
      .maybeSingle();
     if (claimError) {
      throw retryableFinalization("No se pudo iniciar la finalización del documento");
     }
     if (claimed?.finalization_started_at) return claimed.finalization_started_at;
     const { data: reloaded, error: reloadError } = await supabase
      .from("consents")
      .select("finalization_started_at")
      .eq("id", consentId)
      .single();
     if (reloadError || !reloaded?.finalization_started_at) {
      throw retryableFinalization("No se pudo iniciar la finalización del documento");
     }
     return reloaded.finalization_started_at;
    }

    function readArtistSignature(legalAcceptance: unknown) {
     if (!legalAcceptance || typeof legalAcceptance !== "object") return null;
     const signature = (legalAcceptance as Record<string, unknown>).firmaAplicador;
     return typeof signature === "string" && signature.length > 0 ? signature : null;
    }

    async function claimFinalizationArtistSignature(
     supabase: any,
     consentId: string,
     legalAcceptance: unknown,
     artistSignature: string,
    ) {
     const currentSignature = readArtistSignature(legalAcceptance);
     if (currentSignature) return currentSignature;

     const claimedAcceptance = {
      ...(legalAcceptance as Record<string, unknown> | null),
      firmaAplicador: artistSignature,
     };
     const { data: claimed, error: claimError } = await supabase
      .from("consents")
      .update({ legal_acceptance: claimedAcceptance })
      .eq("id", consentId)
      .is("legal_acceptance->>firmaAplicador", null)
      .select("legal_acceptance")
      .maybeSingle();
     if (claimError) {
      throw retryableFinalization("No se pudo reclamar la firma final");
     }

     const claimedSignature = readArtistSignature(claimed?.legal_acceptance);
     if (claimedSignature) return claimedSignature;

     const { data: reloaded, error: reloadError } = await supabase
      .from("consents")
      .select("legal_acceptance")
      .eq("id", consentId)
      .single();
     const reloadedSignature = readArtistSignature(reloaded?.legal_acceptance);
     if (reloadError || !reloadedSignature) {
      throw retryableFinalization("No se pudo comprobar la firma final");
     }
     return reloadedSignature;
    }

    async function claimFinalizationHash(supabase: any, consentId: string, hash: string) {
     const { data: claimed, error: claimError } = await supabase
      .from("consents")
      .update({ finalization_content_sha256: hash })
      .eq("id", consentId)
      .is("finalization_content_sha256", null)
      .select("finalization_content_sha256")
      .maybeSingle();
     if (claimError) throw retryableFinalization("No se pudo reclamar el contenido final");
     if (claimed?.finalization_content_sha256 === hash) return;
     const { data: current, error: reloadError } = await supabase
      .from("consents")
      .select("finalization_content_sha256")
      .eq("id", consentId)
      .single();
     if (reloadError) throw retryableFinalization("No se pudo comprobar el contenido final");
     if (current?.finalization_content_sha256 !== hash) {
      throw new FinalizationError("FINALIZATION_CONTENT_CONFLICT");
     }
    }

    async function loadFinalFile(supabase: any, consentId: string, hash?: string) {
     let query = supabase
      .from("consent_files")
      .select(FINAL_FILE_COLUMNS)
      .eq("consent_id", consentId)
      .eq("document_kind", "final");
     if (hash) query = query.eq("sha256", hash);
     const { data, error } = await query.maybeSingle();
     if (error) throw retryableFinalization("No se pudo comprobar el archivo final");
     return (data as FinalFileRecord | null) ?? null;
    }

    async function loadFinalFileById(supabase: any, fileId: string) {
     const { data, error } = await supabase
      .from("consent_files")
      .select(FINAL_FILE_COLUMNS)
      .eq("id", fileId)
      .single();
     if (error || !data) {
      throw retryableFinalization("El consentimiento firmado no tiene un archivo final válido");
     }
     return data as FinalFileRecord;
    }

        async function markUploadError(supabase: any, consentId: string) {
         await supabase
          .from("consents")
          .update({ status: "upload_error" })
          .eq("id", consentId)
          .in("status", ["pending_artist", "upload_error"]);
        }

    async function persistFinalFile(
     supabase: any,
     consent: any,
     artist: any,
     pdfBuffer: Buffer,
     storagePath: string,
     fileName: string,
     pdfSha256: string,
    ) {
     let finalFile = await loadFinalFile(supabase, consent.id);
     if (finalFile) {
      if (finalFile.sha256 !== pdfSha256) {
       throw new FinalizationError("FINALIZATION_CONTENT_CONFLICT");
      }
      return finalFile;
     }

     const { error: uploadError } = await supabase.storage
      .from("consent-pdfs")
      .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: false });
     const isExistingObject = uploadError && /already exists|duplicate|resource already exists/i.test(uploadError.message ?? "");
     if (uploadError && !isExistingObject) {
      await markUploadError(supabase, consent.id);
      throw new FinalizationError("FINALIZATION_RETRYABLE", `No se pudo almacenar el PDF final: ${uploadError.message}`);
     }

     const { data: insertedFile, error: fileError } = await supabase
      .from("consent_files")
      .insert({
       consent_id: consent.id,
       studio_id: consent.studio_id,
       artist_id: artist.id,
       document_kind: "final",
       bucket_id: "consent-pdfs",
       storage_path: storagePath,
       file_name: fileName,
       mime_type: "application/pdf",
       size_bytes: pdfBuffer.length,
       sha256: pdfSha256,
      })
      .select(FINAL_FILE_COLUMNS)
      .single();
     if (!fileError && insertedFile) return insertedFile as FinalFileRecord;

     finalFile = await loadFinalFile(supabase, consent.id, pdfSha256);
     if (finalFile) return finalFile;
     await markUploadError(supabase, consent.id);
     throw new FinalizationError("FINALIZATION_RETRYABLE", `No se pudo registrar el PDF final: ${fileError?.message ?? "desconocido"}`);
    }

    async function persistArtistSignature(
     supabase: any,
     consent: any,
     artist: any,
     artistSignature: string,
     storagePath: string,
    ) {
     const { error } = await supabase.from("consent_signatures").upsert(
      {
       consent_id: consent.id,
       studio_id: consent.studio_id,
       artist_id: artist.id,
       signer_type: "artist",
       signer_name: artist.full_name,
       signature_hash: sha256Hex(artistSignature),
       metadata: { source: "artist_panel", storage_path: storagePath },
      },
      { onConflict: "consent_id,signer_type" },
     );
     if (error) {
      throw new FinalizationError("FINALIZATION_RETRYABLE", `No se pudo registrar la firma del tatuador: ${error.message}`);
     }
    }

        async function loadStoredFinalPdf(
         supabase: any,
         finalFile: FinalFileRecord,
        ) {
         let data: any;
         let error: any;
         try {
          ({ data, error } = await supabase.storage
           .from("consent-pdfs")
           .download(finalFile.storage_path));
         } catch (storageError) {
          console.error(
           "No se pudo recuperar el PDF final para reconciliar Drive:",
           storageError instanceof Error ? storageError.message : storageError,
          );
          return null;
         }
         if (error || !data) {
          console.error("No se pudo recuperar el PDF final para reconciliar Drive");
          return null;
         }
         try {
          const bytes = Buffer.isBuffer(data)
           ? data
           : data instanceof ArrayBuffer
            ? Buffer.from(data)
            : typeof data.arrayBuffer === "function"
             ? Buffer.from(await data.arrayBuffer())
             : Buffer.from(data);
          if (finalFile.sha256 && sha256Hex(bytes) !== finalFile.sha256) {
           console.error("El PDF final recuperado no coincide con su hash persistido");
           return null;
          }
          return {
           base64: bytes.toString("base64"),
           fileName:
            finalFile.file_name ||
            finalFile.storage_path.split("/").pop() ||
            "consent-final.pdf",
          };
         } catch (storageError) {
          console.error(
           "No se pudo leer el PDF final para reconciliar Drive:",
           storageError instanceof Error ? storageError.message : storageError,
          );
          return null;
         }
        }

        async function reconcileDrive(
         supabase: any,
     consentId: string,
     finalFile: FinalFileRecord,
     base64: string,
     fileName: string,
     artist: any,
     accessToken?: string,
    ) {
     if (!accessToken || !artist.drive_folder_id || finalFile.drive_file_id) return finalFile;
         const claimAt = new Date().toISOString();
         const staleBefore = new Date(
          Date.parse(claimAt) - DRIVE_COPY_CLAIM_TTL_MS,
         ).toISOString();
         let { data: claim, error: claimError } = await supabase
          .from("consent_files")
          .update({ drive_copy_claimed_at: claimAt })
          .eq("id", finalFile.id)
          .is("drive_file_id", null)
          .is("drive_copy_claimed_at", null)
          .select(FINAL_FILE_COLUMNS)
          .maybeSingle();
         if (!claim && !claimError) {
          const staleClaim = await supabase
           .from("consent_files")
           .update({ drive_copy_claimed_at: claimAt })
           .eq("id", finalFile.id)
           .is("drive_file_id", null)
           .lt("drive_copy_claimed_at", staleBefore)
           .select(FINAL_FILE_COLUMNS)
           .maybeSingle();
          claim = staleClaim.data;
          claimError = staleClaim.error;
         }
         if (claimError || !claim) {
          if (claimError) console.error("Error al reclamar la copia Drive del PDF final");
          return finalFile;
         }
     try {
      const driveResult = await uploadToDrive({
       pdfBase64: base64,
       fileName,
       carpetaDriveId: artist.drive_folder_id,
       accessToken,
       consentId,
       pdfSha256: finalFile.sha256 ?? "",
      });
      if (!driveResult?.driveFileId) {
       throw new Error(driveResult?.error || "Drive no devolvió un archivo");
      }
      const { data: saved } = await supabase
       .from("consent_files")
       .update({
        drive_file_id: driveResult.driveFileId,
        drive_view_link: driveResult.driveViewLink,
        drive_copy_completed_at: new Date().toISOString(),
       })
       .eq("id", finalFile.id)
       .is("drive_file_id", null)
       .select(FINAL_FILE_COLUMNS)
       .maybeSingle();
      if (saved) return saved as FinalFileRecord;
      return await loadFinalFileById(supabase, finalFile.id);
     } catch (driveError) {
      await supabase
       .from("consent_files")
       .update({ drive_copy_claimed_at: null })
       .eq("id", finalFile.id)
       .eq("drive_copy_claimed_at", claimAt);
      console.error(
       "Error al copiar el PDF final a Google Drive:",
       driveError instanceof Error ? driveError.message : driveError,
      );
      return finalFile;
     }
    }

        async function reconcileSignedDrive(
         supabase: any,
         consentId: string,
         finalFile: FinalFileRecord,
         artist: any,
         accessToken?: string,
        ) {
         if (
          !accessToken ||
          !artist.drive_folder_id ||
          finalFile.drive_file_id ||
          !finalFile.sha256
         ) {
          return finalFile;
         }
         const storedPdf = await loadStoredFinalPdf(supabase, finalFile);
         if (!storedPdf) return finalFile;
         return reconcileDrive(
          supabase,
          consentId,
          finalFile,
          storedPdf.base64,
          storedPdf.fileName,
          artist,
          accessToken,
         );
        }

        function signedResult(consentId: string, finalFile: FinalFileRecord): SubmitConsentResult {
     return {
      consentId,
      status: "signed",
      storagePath: finalFile.storage_path,
      driveFileId: finalFile.drive_file_id,
      driveViewLink: finalFile.drive_view_link,
     };
    }

    export async function signConsentAsArtist(
     consentId: string,
     artistSignature: string,
     actorUserId: string,
     driveAccessToken?: string,
    ): Promise<SubmitConsentResult> {
	const { supabase, consent, artist } = await getArtistConsentForUser(
		consentId,
		actorUserId,
	);

	if (consent.status === "signed" && consent.final_file_id) {
		const finalFile = await loadFinalFileById(supabase, consent.final_file_id);
		return signedResult(
			consentId,
			await reconcileSignedDrive(
				supabase,
				consentId,
				finalFile,
				artist,
				driveAccessToken,
			),
		);
	}

	if (
		consent.status !== "pending_artist" &&
		consent.status !== "upload_error"
	) {
		throw new Error(
			"Este consentimiento no está preparado para su firma final",
		);
	}

     const { data: studio, error: studioError } = await supabase
      .from("studios")
      .select("*")
      .eq("id", consent.studio_id)
      .single();
     if (studioError || !studio) {
     throw retryableFinalization("No se encontraron los datos del establecimiento");
     }
     assertStudioHealthVerified(studio);
     const effectiveArtistSignature = await claimFinalizationArtistSignature(
      supabase,
      consentId,
      consent.legal_acceptance,
      artistSignature,
     );
     const finalizationStartedAt = await claimFinalizationStart(
      supabase,
      consentId,
      consent.finalization_started_at,
     );
     const finalizedAt = new Date(finalizationStartedAt);
     const document = buildConsentPdfData({
      consent,
      artist,
      studio,
      artistSignature: effectiveArtistSignature,
      generatedAt: finalizedAt,
     });
     const { base64, fileName } = await generateConsentPDF(document);
     const pdfBuffer = Buffer.from(base64, "base64");
     const pdfSha256 = sha256Hex(pdfBuffer);
     await claimFinalizationHash(supabase, consentId, pdfSha256);
     const storagePath = `studios/${consent.studio_id}/artists/${artist.id}/${consent.id}/final/${pdfSha256}.pdf`;

     try {
      fs.writeFileSync(path.join(LOCAL_PDFS_DIR, fileName), pdfBuffer);
     } catch (localErr) {
      console.error(
       "Error al guardar el respaldo local del PDF final:",
       localErr instanceof Error ? localErr.message : localErr,
      );
     }

     const finalFile = await persistFinalFile(
      supabase,
      consent,
      artist,
      pdfBuffer,
      storagePath,
      fileName,
      pdfSha256,
     );
     await persistArtistSignature(
      supabase,
      consent,
      artist,
      effectiveArtistSignature,
      finalFile.storage_path,
     );

     const legalAcceptance = consent.legal_acceptance as Record<string, unknown>;
     const { data: winner, error: updateError } = await supabase
      .from("consents")
      .update({
       status: "signed",
       legal_acceptance: { ...legalAcceptance, firmaAplicador: effectiveArtistSignature },
       document_snapshot: createDocumentSnapshot(document),
       document_template_version: document.templateVersion,
       final_file_id: finalFile.id,
       finalized_at: finalizedAt.toISOString(),
       signed_at: finalizedAt.toISOString(),
      })
      .eq("id", consentId)
      .in("status", ["pending_artist", "upload_error"])
      .select("id, status, final_file_id")
      .maybeSingle();
     if (updateError) {
      throw retryableFinalization(`No se pudo finalizar el consentimiento: ${updateError.message}`);
     }
     if (!winner) {
      const { data: current, error: currentError } = await supabase
       .from("consents")
       .select("status, final_file_id")
       .eq("id", consentId)
       .single();
      if (currentError || current?.status !== "signed" || !current.final_file_id) {
       throw retryableFinalization("No se pudo establecer la finalización del consentimiento");
      }
      return signedResult(consentId, await loadFinalFileById(supabase, current.final_file_id));
     }

     return signedResult(
      consentId,
      await reconcileDrive(
       supabase,
       consentId,
       finalFile,
       base64,
       fileName,
       artist,
       driveAccessToken,
      ),
     );
    }

export async function cancelConsentAsArtist(
	consentId: string,
	actorUserId: string,
): Promise<{ success: boolean; status: "cancelled" }> {
	const { supabase, consent } = await getArtistConsentForUser(
		consentId,
		actorUserId,
	);

	if (consent.status === "signed") {
		throw new Error("No se puede descartar un consentimiento ya firmado");
	}

	if (consent.status === "cancelled") {
		return { success: true, status: "cancelled" };
	}

	const { error: updateError } = await supabase
		.from("consents")
		.update({ status: "cancelled" })
		.eq("id", consentId);

	if (updateError) {
		throw new Error(
			`Error al descartar el consentimiento: ${updateError.message}`,
		);
	}

	const { error: auditError } = await supabase.from("audit_logs").insert({
		studio_id: consent.studio_id,
		artist_id: consent.artist_id,
		consent_id: consent.id,
		action: "consent_cancelled_by_artist",
		metadata: {
			previous_status: consent.status,
			source: "artist_panel",
		},
	});

	if (auditError) {
		console.error(
			"Error registrando auditoría del descarte de consentimiento:",
			auditError,
		);
	}

	return { success: true, status: "cancelled" };
}
