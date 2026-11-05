import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib'
import type { Stroke } from '../../types/drawing'

const ATTACHMENT_FILE_NAME = 'starnote-strokes.json'

/**
 * PDF ドキュメントに StarNote の再編集用ストロークメタデータを添付ファイルとして埋め込む
 */
export async function embedStrokesMetadata(
  pdfDoc: PDFDocument,
  pageStrokes: Record<number, Stroke[]>
): Promise<void> {
  const jsonString = JSON.stringify(pageStrokes)
  const bytes = new TextEncoder().encode(jsonString)

  // 既存の同名添付ファイルがあれば上書きできるように attach を実行
  await pdfDoc.attach(bytes, ATTACHMENT_FILE_NAME, {
    mimeType: 'application/json',
    description: 'StarNote Editable Strokes Metadata',
    creationDate: new Date(),
    modificationDate: new Date(),
  })
}

/**
 * PDFDocument から埋め込まれた StarNote のストロークメタデータを抽出する
 */
export function extractStrokesMetadata(
  pdfDoc: PDFDocument
): Record<number, Stroke[]> | null {
  try {
    const names = pdfDoc.catalog.get(PDFName.of('Names'))
    if (!names) return null

    const namesDict = pdfDoc.context.lookup(names) as PDFDict
    if (!namesDict) return null

    const efRef = namesDict.get(PDFName.of('EmbeddedFiles'))
    if (!efRef) return null

    const ef = pdfDoc.context.lookup(efRef) as PDFDict
    if (!ef) return null

    const namesArrRef = ef.get(PDFName.of('Names'))
    if (!namesArrRef) return null

    const namesArr = pdfDoc.context.lookup(namesArrRef) as PDFArray
    if (!namesArr) return null

    for (let i = 0; i < namesArr.size(); i += 2) {
      const fileSpecRef = namesArr.get(i + 1)
      const fileSpec = pdfDoc.context.lookup(fileSpecRef) as PDFDict
      if (!fileSpec) continue

      const efEntry = fileSpec.get(PDFName.of('EF'))
      if (!efEntry) continue

      const efDict = pdfDoc.context.lookup(efEntry) as PDFDict
      if (!efDict) continue

      const streamRef = efDict.get(PDFName.of('F'))
      if (!streamRef) continue

      const fileStream = pdfDoc.context.lookup(streamRef) as PDFRawStream
      if (!fileStream) continue

      const rawBytes = decodePDFRawStream(fileStream).decode()
      const jsonStr = new TextDecoder().decode(rawBytes)
      const parsed = JSON.parse(jsonStr) as Record<number, Stroke[]>
      return parsed
    }

    return null
  } catch (err) {
    console.warn('Failed to extract strokes metadata from PDF:', err)
    return null
  }
}

/**
 * PDF バイナリ（Uint8Array）から直接ストロークメタデータを抽出する
 */
export async function extractStrokesMetadataFromBytes(
  pdfBytes: Uint8Array
): Promise<Record<number, Stroke[]> | null> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
    return extractStrokesMetadata(pdfDoc)
  } catch (err) {
    console.warn('Failed to load PDF bytes for metadata extraction:', err)
    return null
  }
}
