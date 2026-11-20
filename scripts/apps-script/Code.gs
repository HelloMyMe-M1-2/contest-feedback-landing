// Google Apps Script web app. Set SPREADSHEET_ID and SIGNUP_SHARED_SECRET in Script Properties.
// Never put credentials in this file, a URL, a log, or the public repository.
function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON)
}

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties()
    const secret = props.getProperty('SIGNUP_SHARED_SECRET')
    const sheetId = props.getProperty('SPREADSHEET_ID')
    const raw = e && e.postData && e.postData.contents
    if (!secret || secret.length < 32 || !sheetId || typeof raw !== 'string' || raw.length > 2048) return jsonOutput_({ ok: false })
    const data = JSON.parse(raw)
    if (!data || typeof data.secret !== 'string' || data.secret !== secret) return jsonOutput_({ ok: false })
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : ''
    const stage = data.stage === undefined ? '' : data.stage
    const stages = ['', 'within_1m', 'over_1m', 'exploring']
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !stages.includes(stage) || data.consent !== true || data.consent_version !== '1') return jsonOutput_({ ok: false })
    const lock = LockService.getScriptLock()
    if (!lock.tryLock(10000)) return jsonOutput_({ ok: false })
    try {
      const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('signups')
      if (!sheet) return jsonOutput_({ ok: false })
      // Escape spreadsheet formula prefixes even for unusual but accepted email addresses.
      const safeEmail = /^[=+\-@]/.test(email) ? "'" + email : email
      const row = [new Date().toISOString(), safeEmail, stage, '1']
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, 4).setNumberFormat('@').setValues([row])
      SpreadsheetApp.flush()
      return jsonOutput_({ ok: true })
    } finally { lock.releaseLock() }
  } catch (_) {
    // No request body, email or secret is written to logs.
    return jsonOutput_({ ok: false })
  }
}
