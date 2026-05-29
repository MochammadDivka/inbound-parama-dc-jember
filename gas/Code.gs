/**
 * Parama Global Inspira DC Jember — Google Apps Script Backend
 * ==============================================================
 * Deploy sebagai Web App di Google Apps Script
 * Akses: "Anyone" (authenticated via secret key)
 *
 * Google Sheets structure:
 *   Sheet "USERS"  — kolom: user_id, nama, username, email, pin_hash, password_hash, role, status, created_at, updated_at
 *   Sheet "ISSUES" — kolom: issue_id, hu, do_number, sku, nama_barang, batch, qty_system_pcs,
 *                            qty_fisik_pcs, selisih_pcs, remaining_selisih_pcs, merge_history, merge_count,
 *                            kategori_issue, keterangan, photo_url, status, storage_tujuan,
 *                            solved_by, solved_at, cancelled_by, cancelled_at,
 *                            req_solved_by, req_solved_at, req_solved_reason, reject_reason,
 *                            created_by, created_at, updated_by, updated_at, input_source
 *   Sheet "CZ"     — kolom: cz_id, hu, do_number, sku, nama_barang, batch, qty_pcs, keterangan,
 *                            status, storage_tujuan, catatan_penyelesaian, created_by, created_at,
 *                            solved_by, solved_at
 *   Sheet "LOGS"   — kolom: log_id, reference_id, reference_type, action, performed_by, timestamp, notes
 */

// ─── Config ──────────────────────────────────────────────────────
var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
var SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');

var SHEETS = {
  USERS: 'USERS',
  ISSUES: 'ISSUES',
  CZ: 'CZ',
  LOGS: 'LOGS'
};

// ─── Entry Points ────────────────────────────────────────────────

function doGet(e) {
  try {
    if (!validateAuth(e)) return authError();
    var action = e.parameter.action;
    var id = e.parameter.id;

    switch (action) {
      case 'getIssues':    return jsonResponse(getIssues(e.parameter));
      case 'getIssue':     return jsonResponse(getIssue(id));
      case 'checkDuplicateIssue': return jsonResponse(checkDuplicateIssue(e.parameter));
      case 'getCZ':        return jsonResponse(getCZ(e.parameter));
      case 'getCZRecord':  return jsonResponse(getCZRecord(id));
      case 'checkDuplicateCZ': return jsonResponse(checkDuplicateCZ(e.parameter));
      case 'getUsers':     return jsonResponse(getUsers(e.parameter));
      case 'getUser':      return jsonResponse(getUser(id));
      case 'getUserForAuth':    return jsonResponse(getUserForAuth(e.parameter.username));
      case 'getAdminForAuth':   return jsonResponse(getAdminForAuth(e.parameter.email));
      case 'getDashboard': return jsonResponse(getDashboard(e.parameter));
      case 'getLogs':      return jsonResponse(getLogs(e.parameter));
      default:
        return errorResponse('UNKNOWN_ACTION', 'Action tidak dikenal', 400);
    }
  } catch (err) {
    return errorResponse('SERVER_ERROR', err.toString(), 500);
  }
}

function doPost(e) {
  try {
    if (!validateAuth(e)) return authError();

    var body = {};
    try {
      body = JSON.parse(e.postData.contents);
    } catch (_) {}

    var action = body.action || e.parameter.action;

    switch (action) {
      case 'createIssue':   return jsonResponse(createIssue(body));
      case 'updateIssue':   return jsonResponse(updateIssue(body.id, body));
      case 'solveIssue':    return jsonResponse(solveIssue(body.id, body));
      case 'cancelIssue':   return jsonResponse(cancelIssue(body.id, body));
      case 'requestSolved': return jsonResponse(requestSolved(body.id, body));
      case 'rejectSolved':  return jsonResponse(rejectSolved(body.id, body));
      case 'approveSolved': return jsonResponse(approveSolved(body.id, body));
      case 'mergeIssue':    return jsonResponse(mergeIssue(body.id, body));
      case 'updatePhotoUrl': return jsonResponse(updatePhotoUrl(body.id, body));
      case 'uploadPhoto':   return jsonResponse(uploadPhoto(body));
      case 'createCZ':      return jsonResponse(createCZ(body));
      case 'updateCZ':      return jsonResponse(updateCZ(body.id, body));
      case 'solveCZ':       return jsonResponse(solveCZ(body.id, body));
      case 'deleteCZ':      return jsonResponse(deleteCZ(body.id, body));
      case 'createUser':    return jsonResponse(createUser(body));
      case 'resetPin':      return jsonResponse(resetPin(body.id, body));
      case 'toggleStatus':  return jsonResponse(toggleStatus(body.id, body));
      case 'addLog':        return jsonResponse(addLog(body));
      default:
        return errorResponse('UNKNOWN_ACTION', 'Action tidak dikenal', 400);
    }
  } catch (err) {
    return errorResponse('SERVER_ERROR', err.toString(), 500);
  }
}

// ─── Auth ────────────────────────────────────────────────────────

function validateAuth(e) {
  if (!SECRET_KEY) return true; // No secret set — allow all (development only)
  var authHeader = (e.parameter.secret || '');
  return authHeader === SECRET_KEY;
}

function authError() {
  return errorResponse('UNAUTHORIZED', 'Secret key tidak valid', 401);
}

// ─── Sheet Helpers ───────────────────────────────────────────────

function getSheet(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" tidak ditemukan');
  return sheet;
}

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i] !== '' ? row[i] : null; });
    return obj;
  });
}

function appendRow(sheetName, obj) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}

function updateRow(sheetName, idField, id, updates) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf(idField);
  if (idCol === -1) throw new Error('Field ' + idField + ' tidak ditemukan');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      Object.keys(updates).forEach(function(key) {
        var col = headers.indexOf(key);
        if (col !== -1) {
          sheet.getRange(i + 1, col + 1).setValue(updates[key]);
        }
      });
      return true;
    }
  }
  return false;
}

// ─── ID Generation ───────────────────────────────────────────────

function generateIssueId() {
  var sheet = getSheet(SHEETS.ISSUES);
  var lastRow = sheet.getLastRow();
  var count = Math.max(lastRow - 1, 0) + 1;
  var year = new Date().getFullYear();
  return 'ISS-' + year + '-' + String(count).padStart(5, '0');
}

function generateCZId() {
  var sheet = getSheet(SHEETS.CZ);
  var lastRow = sheet.getLastRow();
  var count = Math.max(lastRow - 1, 0) + 1;
  var year = new Date().getFullYear();
  return 'CZ-' + year + '-' + String(count).padStart(5, '0');
}

function generateUserId(role) {
  var records = sheetToObjects(getSheet(SHEETS.USERS));
  var prefix = role === 'ADMIN' ? 'ADM' : 'USER';
  var pattern = new RegExp('^' + prefix + '-(\\d+)$');
  var maxNum = 0;
  records.forEach(function(u) {
    var m = (u.user_id || '').match(pattern);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  });
  return prefix + '-' + String(maxNum + 1).padStart(4, '0');
}

// ─── Issues ─────────────────────────────────────────────────────

function getRelevanceScore(i, q) {
  var score = 0;
  var issueId = String(i.issue_id || '').toLowerCase();
  var sku = String(i.sku || '').toLowerCase();
  var hu = String(i.hu || '').toLowerCase();
  var doNumber = String(i.do_number || '').toLowerCase();
  var namaBarang = String(i.nama_barang || '').toLowerCase();

  if (issueId === q) score += 1000;
  else if (sku === q) score += 800;
  else if (hu === q) score += 500;
  else if (doNumber === q) score += 400;
  else if (issueId.indexOf(q) === 0) score += 300;
  else if (sku.indexOf(q) === 0) score += 250;
  else if (hu.indexOf(q) === 0) score += 200;
  else if (doNumber.indexOf(q) === 0) score += 150;
  else if (issueId.indexOf(q) > -1) score += 100;
  else if (sku.indexOf(q) > -1) score += 80;
  else if (hu.indexOf(q) > -1) score += 50;
  else if (doNumber.indexOf(q) > -1) score += 40;
  else if (namaBarang.indexOf(q) > -1) score += 30;

  return score;
}

function getIssues(params) {
  var records = sheetToObjects(getSheet(SHEETS.ISSUES));
  var users = sheetToObjects(getSheet(SHEETS.USERS));
  var userMap = {};
  users.forEach(function(u) { userMap[u.user_id] = u.nama; });

  // Enrich with user names
  records = records.map(function(i) {
    i.created_by_name = userMap[i.created_by] || i.created_by;
    i.solved_by_name = i.solved_by ? (userMap[i.solved_by] || i.solved_by) : null;
    i.cancelled_by_name = i.cancelled_by ? (userMap[i.cancelled_by] || i.cancelled_by) : null;
    i.qty_system_pcs = Number(i.qty_system_pcs);
    i.qty_fisik_pcs = Number(i.qty_fisik_pcs);
    i.selisih_pcs = Number(i.selisih_pcs);
    i.remaining_selisih_pcs = (i.remaining_selisih_pcs !== undefined && i.remaining_selisih_pcs !== null && i.remaining_selisih_pcs !== '')
      ? Number(i.remaining_selisih_pcs)
      : null;
    i.merge_count = (i.merge_count !== undefined && i.merge_count !== null && i.merge_count !== '')
      ? Number(i.merge_count)
      : 0;
    return i;
  });

  // Filters
  if (params.user_id) records = records.filter(function(i) { return i.created_by === params.user_id; });
  if (params.status && params.status !== 'ALL') records = records.filter(function(i) { return i.status === params.status; });
  if (params.search) {
    var q = params.search.toLowerCase();
    records = records.filter(function(i) {
      return String(i.sku||'').toLowerCase().indexOf(q) > -1 ||
             String(i.nama_barang||'').toLowerCase().indexOf(q) > -1 ||
             String(i.issue_id||'').toLowerCase().indexOf(q) > -1 ||
             String(i.hu||'').toLowerCase().indexOf(q) > -1 ||
             String(i.do_number||'').toLowerCase().indexOf(q) > -1;
    });
  }
  if (params.kategori && params.kategori !== 'ALL') records = records.filter(function(i) { return i.kategori_issue === params.kategori; });
  if (params.created_by) records = records.filter(function(i) { return i.created_by === params.created_by; });

  // Sort
  var sortField = params.sort;
  var sortOrder = params.order || 'desc';
  var useRelevance = params.search && (!sortField || (sortField === 'created_at' && sortOrder === 'desc'));

  if (useRelevance) {
    var q = params.search.toLowerCase();
    records.sort(function(a, b) {
      var scoreA = getRelevanceScore(a, q);
      var scoreB = getRelevanceScore(b, q);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      var dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      var dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  } else if (sortField) {
    records.sort(function(a, b) {
      var valA = a[sortField];
      var valB = b[sortField];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      // Date sorting
      if (sortField === 'created_at' || sortField === 'updated_at' || sortField === 'solved_at' || sortField === 'cancelled_at' || sortField === 'req_solved_at') {
        var dateAStr = (sortField === 'updated_at' || sortField === 'created_at') ? (a.updated_at || a.created_at) : valA;
        var dateBStr = (sortField === 'updated_at' || sortField === 'created_at') ? (b.updated_at || b.created_at) : valB;
        var dateA = dateAStr ? new Date(dateAStr).getTime() : 0;
        var dateB = dateBStr ? new Date(dateBStr).getTime() : 0;
        if (isNaN(dateA)) dateA = 0;
        if (isNaN(dateB)) dateB = 0;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }

      // Number sorting
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      // String sorting (case-insensitive)
      var strA = String(valA).toLowerCase().trim();
      var strB = String(valB).toLowerCase().trim();
      if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
      if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  } else {
    records.sort(function(a, b) {
      var dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      var dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }

  // Pagination
  var page = parseInt(params.page || '1');
  var limit = Math.min(100, parseInt(params.limit || '20'));
  var total = records.length;
  var start = (page - 1) * limit;
  var paginated = records.slice(start, start + limit);

  return { success: true, data: paginated, total: total, page: page, limit: limit, totalPages: Math.ceil(total / limit) };
}

function getIssue(id) {
  var records = sheetToObjects(getSheet(SHEETS.ISSUES));
  var issue = records.find(function(i) { return i.issue_id === id; });
  if (!issue) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  var users = sheetToObjects(getSheet(SHEETS.USERS));
  var userMap = {};
  users.forEach(function(u) { userMap[u.user_id] = u.nama; });
  issue.created_by_name = userMap[issue.created_by] || issue.created_by;
  if (issue.solved_by) issue.solved_by_name = userMap[issue.solved_by] || issue.solved_by;
  issue.qty_system_pcs = Number(issue.qty_system_pcs);
  issue.qty_fisik_pcs = Number(issue.qty_fisik_pcs);
  issue.selisih_pcs = Number(issue.selisih_pcs);
  issue.remaining_selisih_pcs = (issue.remaining_selisih_pcs !== undefined && issue.remaining_selisih_pcs !== null && issue.remaining_selisih_pcs !== '')
    ? Number(issue.remaining_selisih_pcs)
    : null;
  issue.merge_count = (issue.merge_count !== undefined && issue.merge_count !== null && issue.merge_count !== '')
    ? Number(issue.merge_count)
    : 0;
  return { success: true, data: issue };
}

function checkDuplicateIssue(params) {
  if (!params.sku || !params.batch) return { success: true, data: { isDuplicate: false } };
  var records = sheetToObjects(getSheet(SHEETS.ISSUES));
  var dup = records.find(function(i) {
    return String(i.sku || '').trim() === String(params.sku || '').trim() &&
           String(i.batch || '').trim().toUpperCase() === String(params.batch || '').trim().toUpperCase() &&
           i.status === 'OPEN' &&
           (params.exclude_id ? i.issue_id !== params.exclude_id : true);
  });
  return { success: true, data: { isDuplicate: !!dup, existing_id: dup ? dup.issue_id : null } };
}

function createIssue(body) {
  // Duplicate check
  var dupCheck = checkDuplicateIssue(body);
  if (dupCheck.data && dupCheck.data.isDuplicate) {
    return { success: false, error: { code: 'DUPLICATE_ISSUE', message: 'Issue duplikat', details: { existing_id: dupCheck.data.existing_id } } };
  }

  var now = new Date().toISOString();
  var selisih = Number(body.qty_fisik_pcs) - Number(body.qty_system_pcs);
  var issue = {
    issue_id: generateIssueId(),
    hu: body.hu || '',
    do_number: body.do_number || '',
    sku: body.sku || '',
    nama_barang: body.nama_barang,
    batch: body.batch ? body.batch.toUpperCase() : '',
    qty_system_pcs: Number(body.qty_system_pcs),
    qty_fisik_pcs: Number(body.qty_fisik_pcs),
    selisih_pcs: selisih,
    remaining_selisih_pcs: selisih,
    merge_history: '[]',
    merge_count: 0,
    kategori_issue: body.kategori_issue,
    keterangan: body.keterangan || '',
    photo_url: body.photo_url || '',
    status: 'OPEN',
    storage_tujuan: '',
    solved_by: '', solved_at: '',
    cancelled_by: '', cancelled_at: '',
    req_solved_by: '', req_solved_at: '', req_solved_reason: '',
    reject_reason: '',
    created_by: body.created_by, // nama user, bukan ID
    created_at: body.created_at || now,
    updated_by: body.created_by,
    updated_at: body.created_at || now,
    input_source: 'WEB'
  };
  appendRow(SHEETS.ISSUES, issue);
  addLogInternal('ISSUE', issue.issue_id, 'issue_created', body.performed_by || body.created_by, 'Issue baru dibuat');
  return { success: true, data: issue, message: 'Issue berhasil dibuat' };
}

function updateIssue(id, body) {
  var now = new Date().toISOString();
  
  // Ambil issue existing untuk sinkronisasi remaining_selisih_pcs
  var issues = sheetToObjects(getSheet(SHEETS.ISSUES));
  var existing = null;
  for (var i = 0; i < issues.length; i++) {
    if (issues[i].issue_id === id) { existing = issues[i]; break; }
  }
  if (!existing) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };

  var oldSelisih = Number(existing.selisih_pcs || 0);
  var newSelisih = Number(body.qty_fisik_pcs !== undefined ? body.qty_fisik_pcs : existing.qty_fisik_pcs) - 
                   Number(body.qty_system_pcs !== undefined ? body.qty_system_pcs : existing.qty_system_pcs);
  var diffSelisih = newSelisih - oldSelisih;
  
  var newRemaining = Number(existing.remaining_selisih_pcs || 0);
  if (Number(existing.merge_count || 0) > 0) {
    newRemaining = newRemaining + diffSelisih;
  } else {
    newRemaining = newSelisih;
  }

  var updates = {
    sku: body.sku,
    nama_barang: body.nama_barang,
    batch: body.batch !== undefined ? body.batch.toUpperCase() : undefined,
    hu: body.hu,
    do_number: body.do_number,
    qty_system_pcs: body.qty_system_pcs !== undefined ? Number(body.qty_system_pcs) : undefined,
    qty_fisik_pcs: body.qty_fisik_pcs !== undefined ? Number(body.qty_fisik_pcs) : undefined,
    selisih_pcs: newSelisih,
    remaining_selisih_pcs: newRemaining,
    kategori_issue: body.kategori_issue,
    keterangan: body.keterangan,
    photo_url: body.photo_url,
    storage_tujuan: body.storage_tujuan,
    updated_by: body.updated_by,
    updated_at: now
  };
  // Remove undefined keys
  Object.keys(updates).forEach(function(k) { if (updates[k] === undefined) delete updates[k]; });
  var found = updateRow(SHEETS.ISSUES, 'issue_id', id, updates);
  if (!found) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  addLogInternal('ISSUE', id, 'issue_edited', body.performed_by || body.updated_by, 'Issue diperbarui');
  return { success: true, message: 'Issue berhasil diperbarui' };
}

function solveIssue(id, body) {
  var now = new Date().toISOString();
  var updates = { status: 'SOLVED', storage_tujuan: body.storage_tujuan || '', solved_by: body.solved_by, solved_at: now, updated_by: body.solved_by, updated_at: now };
  var found = updateRow(SHEETS.ISSUES, 'issue_id', id, updates);
  if (!found) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  addLogInternal('ISSUE', id, 'issue_solved', body.performed_by || body.solved_by, body.catatan || 'Issue diselesaikan');
  return { success: true, message: 'Issue berhasil diselesaikan' };
}

function cancelIssue(id, body) {
  var now = new Date().toISOString();
  var updates = { status: 'CANCELLED', cancelled_by: body.cancelled_by, cancelled_at: now, updated_by: body.cancelled_by, updated_at: now };
  var found = updateRow(SHEETS.ISSUES, 'issue_id', id, updates);
  if (!found) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  addLogInternal('ISSUE', id, 'issue_cancelled', body.performed_by || body.cancelled_by, body.alasan || 'Issue dibatalkan');
  return { success: true, message: 'Issue berhasil dibatalkan' };
}

function requestSolved(id, body) {
  var now = new Date().toISOString();
  var updates = {
    status: 'WAITING_APPROVAL',
    req_solved_by: body.req_solved_by,
    req_solved_at: now,
    req_solved_reason: body.req_solved_reason || '',
    updated_by: body.req_solved_by,
    updated_at: now
  };
  var found = updateRow(SHEETS.ISSUES, 'issue_id', id, updates);
  if (!found) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  addLogInternal('ISSUE', id, 'request_solved', body.performed_by || body.req_solved_by, body.req_solved_reason || 'Request solved diajukan');
  return { success: true, message: 'Request solved berhasil diajukan' };
}

function rejectSolved(id, body) {
  var now = new Date().toISOString();
  var updates = {
    status: 'OPEN',
    reject_reason: body.reject_reason,
    req_solved_by: '',
    req_solved_at: '',
    req_solved_reason: '',
    updated_by: body.rejected_by || body.performed_by || '',
    updated_at: now
  };
  var found = updateRow(SHEETS.ISSUES, 'issue_id', id, updates);
  if (!found) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  addLogInternal('ISSUE', id, 'reject_solved', body.performed_by || body.rejected_by, 'Request ditolak: ' + (body.reject_reason || ''));
  return { success: true, message: 'Request solved ditolak, issue kembali OPEN' };
}

function approveSolved(id, body) {
  var now = new Date().toISOString();
  var updates = {
    status: 'SOLVED',
    storage_tujuan: body.storage_tujuan || '',
    solved_by: body.solved_by || body.performed_by || '',
    solved_at: now,
    updated_by: body.solved_by || body.performed_by || '',
    updated_at: now
  };
  var found = updateRow(SHEETS.ISSUES, 'issue_id', id, updates);
  if (!found) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  addLogInternal('ISSUE', id, 'approve_solved', body.performed_by || body.solved_by, 'Request solved di-approve oleh admin');
  return { success: true, message: 'Issue berhasil di-approve dan SOLVED' };
}

function mergeIssue(id, body) {
  var now = new Date().toISOString();
  // Ambil issue existing
  var issues = sheetToObjects(getSheet(SHEETS.ISSUES));
  var existing = null;
  for (var i = 0; i < issues.length; i++) {
    if (issues[i].issue_id === id) { existing = issues[i]; break; }
  }
  if (!existing) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };

  var currentRemaining = (existing.remaining_selisih_pcs !== undefined && existing.remaining_selisih_pcs !== null && existing.remaining_selisih_pcs !== '')
    ? Number(existing.remaining_selisih_pcs)
    : Number(existing.selisih_pcs || 0);
  var newSelisih = Number(body.new_selisih || 0);
  var newRemaining = currentRemaining + newSelisih;

  var existingHistory = [];
  try { existingHistory = JSON.parse(existing.merge_history || '[]'); } catch (_) {}

  existingHistory.push({
    timestamp: now,
    action: 'merge',
    selisih_added: newSelisih,
    remaining: newRemaining,
    by: body.by || body.performed_by || '',
    keterangan: body.keterangan || ''
  });

  var updates = {
    remaining_selisih_pcs: newRemaining,
    merge_history: JSON.stringify(existingHistory),
    merge_count: Number(existing.merge_count || 0) + 1,
    updated_by: body.by || body.performed_by || '',
    updated_at: now
  };

  var found = updateRow(SHEETS.ISSUES, 'issue_id', id, updates);
  if (!found) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  addLogInternal('ISSUE', id, 'issue_merged', body.performed_by || body.by, 'Merge +' + newSelisih + ' PCS. Remaining: ' + newRemaining);
  return {
    success: true,
    data: { remaining_selisih_pcs: newRemaining, balanced: newRemaining === 0 },
    message: 'Merge berhasil'
  };
}

function updatePhotoUrl(id, body) {
  var now = new Date().toISOString();
  var updates = {
    photo_url: body.photo_url || '',
    updated_at: now
  };
  var found = updateRow(SHEETS.ISSUES, 'issue_id', id, updates);
  if (!found) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  return { success: true, message: 'Photo URL berhasil diperbarui' };
}

// ─── CZ ─────────────────────────────────────────────────────────

function getCZRelevanceScore(c, q) {
  var score = 0;
  var czId = String(c.cz_id || '').toLowerCase();
  var sku = String(c.sku || '').toLowerCase();
  var hu = String(c.hu || '').toLowerCase();
  var doNumber = String(c.do_number || '').toLowerCase();
  var namaBarang = String(c.nama_barang || '').toLowerCase();

  if (czId === q) score += 1000;
  else if (sku === q) score += 800;
  else if (hu === q) score += 500;
  else if (doNumber === q) score += 400;
  else if (czId.indexOf(q) === 0) score += 300;
  else if (sku.indexOf(q) === 0) score += 250;
  else if (hu.indexOf(q) === 0) score += 200;
  else if (doNumber.indexOf(q) === 0) score += 150;
  else if (czId.indexOf(q) > -1) score += 100;
  else if (sku.indexOf(q) > -1) score += 80;
  else if (hu.indexOf(q) > -1) score += 50;
  else if (doNumber.indexOf(q) > -1) score += 40;
  else if (namaBarang.indexOf(q) > -1) score += 30;

  return score;
}

function getCZ(params) {
  var records = sheetToObjects(getSheet(SHEETS.CZ));
  var users = sheetToObjects(getSheet(SHEETS.USERS));
  var userMap = {};
  users.forEach(function(u) { userMap[u.user_id] = u.nama; });
  records = records.map(function(c) {
    c.created_by_name = userMap[c.created_by] || c.created_by;
    if (c.solved_by) c.solved_by_name = userMap[c.solved_by] || c.solved_by;
    c.qty_pcs = Number(c.qty_pcs);
    return c;
  });
  if (params.user_id) records = records.filter(function(c) { return c.created_by === params.user_id; });
  if (params.status && params.status !== 'ALL') records = records.filter(function(c) { return c.status === params.status; });
  
  if (params.search) {
    var q = params.search.toLowerCase();
    records = records.filter(function(c) {
      return String(c.sku||'').toLowerCase().indexOf(q) > -1 ||
             String(c.nama_barang||'').toLowerCase().indexOf(q) > -1 ||
             String(c.cz_id||'').toLowerCase().indexOf(q) > -1 ||
             String(c.hu||'').toLowerCase().indexOf(q) > -1 ||
             String(c.do_number||'').toLowerCase().indexOf(q) > -1;
    });
    records.sort(function(a, b) {
      var scoreA = getCZRelevanceScore(a, q);
      var scoreB = getCZRelevanceScore(b, q);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
  } else {
    records.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  }
  
  return { success: true, data: records, total: records.length };
}

function getCZRecord(id) {
  var records = sheetToObjects(getSheet(SHEETS.CZ));
  var record = records.find(function(c) { return c.cz_id === id; });
  if (!record) return { success: false, error: { code: 'NOT_FOUND', message: 'CZ record tidak ditemukan' } };
  record.qty_pcs = Number(record.qty_pcs);
  return { success: true, data: record };
}

function checkDuplicateCZ(params) {
  if (!params.sku) return { success: true, data: { isDuplicate: false } };
  var records = sheetToObjects(getSheet(SHEETS.CZ));
  var dup = records.find(function(c) {
    return String(c.sku || '').trim() === String(params.sku || '').trim() &&
           c.status === 'OPEN' &&
           (params.exclude_id ? c.cz_id !== params.exclude_id : true);
  });
  return { success: true, data: { isDuplicate: !!dup, existing_id: dup ? dup.cz_id : null } };
}

function createCZ(body) {
  var dupCheck = checkDuplicateCZ(body);
  if (dupCheck.data && dupCheck.data.isDuplicate) {
    return { success: false, error: { code: 'DUPLICATE_CZ', message: 'CZ record duplikat', details: { existing_id: dupCheck.data.existing_id } } };
  }
  var now = new Date().toISOString();
  var record = {
    cz_id: generateCZId(),
    hu: body.hu || '', do_number: body.do_number || '',
    sku: body.sku, nama_barang: body.nama_barang, batch: body.batch,
    qty_pcs: Number(body.qty_pcs), keterangan: body.keterangan || '',
    status: 'OPEN', storage_tujuan: '', catatan_penyelesaian: '',
    created_by: body.created_by, created_at: now,
    solved_by: '', solved_at: ''
  };
  appendRow(SHEETS.CZ, record);
  addLogInternal('CZ', record.cz_id, 'cz_created', body.performed_by || body.created_by, 'CZ record baru dibuat');
  return { success: true, data: record, message: 'CZ record berhasil dibuat' };
}

function solveCZ(id, body) {
  if (!body.storage_tujuan) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Storage tujuan wajib diisi' } };
  var now = new Date().toISOString();
  var updates = { status: 'SOLVED', storage_tujuan: body.storage_tujuan, catatan_penyelesaian: body.catatan_penyelesaian || '', solved_by: body.solved_by, solved_at: now };
  var found = updateRow(SHEETS.CZ, 'cz_id', id, updates);
  if (!found) return { success: false, error: { code: 'NOT_FOUND', message: 'CZ record tidak ditemukan' } };
  addLogInternal('CZ', id, 'cz_solved', body.performed_by || body.solved_by, 'CZ diselesaikan ke ' + body.storage_tujuan);
  return { success: true, message: 'CZ record berhasil diselesaikan' };
}

function updateCZ(id, body) {
  var now = new Date().toISOString();

  if (body.sku !== undefined) {
    var existingCZRes = getCZRecord(id);
    if (existingCZRes.success && existingCZRes.data) {
      var currentSku = body.sku;
      var dupCheck = checkDuplicateCZ({ sku: currentSku, exclude_id: id });
      if (dupCheck.data && dupCheck.data.isDuplicate) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_CZ',
            message: 'CZ record duplikat dengan SKU aktif lainnya',
            details: { existing_id: dupCheck.data.existing_id }
          }
        };
      }
    }
  }

  var updates = {
    sku: body.sku,
    nama_barang: body.nama_barang,
    batch: body.batch !== undefined ? body.batch.toUpperCase() : undefined,
    hu: body.hu,
    do_number: body.do_number,
    qty_pcs: body.qty_pcs !== undefined ? Number(body.qty_pcs) : undefined,
    keterangan: body.keterangan,
    storage_tujuan: body.storage_tujuan
  };
  // Remove undefined keys
  Object.keys(updates).forEach(function(k) { if (updates[k] === undefined) delete updates[k]; });
  var found = updateRow(SHEETS.CZ, 'cz_id', id, updates);
  if (!found) return { success: false, error: { code: 'NOT_FOUND', message: 'CZ record tidak ditemukan' } };
  addLogInternal('CZ', id, 'cz_edited', body.performed_by || body.updated_by, 'CZ record diperbarui');
  return { success: true, message: 'CZ record berhasil diperbarui' };
}

function deleteCZ(id, body) {
  var found = deleteRow(SHEETS.CZ, 'cz_id', id);
  if (!found) return { success: false, error: { code: 'NOT_FOUND', message: 'CZ record tidak ditemukan' } };
  addLogInternal('CZ', id, 'cz_deleted', body.performed_by || body.deleted_by || 'system', 'CZ record dihapus');
  return { success: true, message: 'CZ record berhasil dihapus' };
}

function deleteRow(sheetName, idField, id) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf(idField);
  if (idCol === -1) throw new Error('Field ' + idField + ' tidak ditemukan');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// ─── Users ──────────────────────────────────────────────────────

function getUsers(params) {
  var records = sheetToObjects(getSheet(SHEETS.USERS));
  // Never expose pin_hash
  records = records.map(function(u) { var copy = Object.assign({}, u); delete copy.pin_hash; return copy; });
  if (params && params.search) {
    var q = params.search.toLowerCase();
    records = records.filter(function(u) {
      return (u.nama||'').toLowerCase().indexOf(q) > -1 || (u.username||'').toLowerCase().indexOf(q) > -1;
    });
  }
  return { success: true, data: records, total: records.length };
}

function getUser(id) {
  var records = sheetToObjects(getSheet(SHEETS.USERS));
  var user = records.find(function(u) { return u.user_id === id; });
  if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } };
  var copy = Object.assign({}, user); delete copy.pin_hash;
  return { success: true, data: copy };
}

/**
 * AUTH-ONLY: Returns user + pin_hash for server-side bcrypt comparison.
 * Only accessible via secret key. NEVER call from client-side code.
 */
function getUserForAuth(username) {
  if (!username) return { success: false, error: { code: 'BAD_REQUEST', message: 'Username wajib diisi' } };
  var records = sheetToObjects(getSheet(SHEETS.USERS));
  var user = records.find(function(u) { return (u.username || '').toLowerCase() === username.toLowerCase(); });
  if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } };
  if (!user.pin_hash) return { success: false, error: { code: 'NO_CREDENTIAL', message: 'User belum memiliki PIN' } };
  // Return user (without pin_hash in nested user object) + pin_hash at top level
  var safeUser = Object.assign({}, user); delete safeUser.pin_hash;
  return { success: true, data: { user: safeUser, pin_hash: user.pin_hash } };
}

/**
 * AUTH-ONLY: Returns user + password_hash for admin email login.
 * Reads from ADMINS sheet (or USERS sheet with email column).
 * Only accessible via secret key.
 */
function getAdminForAuth(email) {
  if (!email) return { success: false, error: { code: 'BAD_REQUEST', message: 'Email wajib diisi' } };
  var records = sheetToObjects(getSheet(SHEETS.USERS));
  var user = records.find(function(u) {
    return u.email && u.email.toLowerCase() === email.toLowerCase() &&
           u.role === 'ADMIN'; // Hapus SPV — hanya ADMIN yang bisa login via email
  });
  if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'Admin tidak ditemukan' } };
  if (!user.password_hash) return { success: false, error: { code: 'NO_CREDENTIAL', message: 'User belum memiliki password' } };
  var safeUser = Object.assign({}, user); delete safeUser.pin_hash; delete safeUser.password_hash;
  return { success: true, data: { user: safeUser, password_hash: user.password_hash } };
}

function createUser(body) {
  var records = sheetToObjects(getSheet(SHEETS.USERS));
  var existing = records.find(function(u) { return u.username === body.username; });
  if (existing) return { success: false, error: { code: 'DUPLICATE_USERNAME', message: 'Username sudah digunakan' } };
  var role = (body.role === 'ADMIN') ? 'ADMIN' : 'USER'; // Hapus SPV
  var now = new Date().toISOString();
  var user = {
    user_id: generateUserId(role), // Format: ADM-0001 / USER-0001
    nama: body.nama, username: body.username.toLowerCase(),
    email: body.email || '',
    pin_hash: body.pin_hash || '', // Hashed by Next.js layer
    password_hash: body.password_hash || '',
    role: role, status: 'ACTIVE',
    created_at: now, updated_at: now
  };
  appendRow(SHEETS.USERS, user);
  addLogInternal('USER', user.user_id, 'user_created', body.performed_by || 'system', 'User ' + body.username + ' dibuat');
  var copy = Object.assign({}, user); delete copy.pin_hash; delete copy.password_hash;
  return { success: true, data: copy, message: 'User berhasil ditambahkan' };
}

function resetPin(id, body) {
  var found = updateRow(SHEETS.USERS, 'user_id', id, { pin_hash: body.pin_hash, updated_at: new Date().toISOString() });
  if (!found) return { success: false, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } };
  addLogInternal('USER', id, 'pin_reset', body.performed_by || 'admin', 'PIN direset');
  return { success: true, message: 'PIN berhasil direset' };
}

function toggleStatus(id, body) {
  var records = sheetToObjects(getSheet(SHEETS.USERS));
  var user = records.find(function(u) { return u.user_id === id; });
  if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } };
  var newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  updateRow(SHEETS.USERS, 'user_id', id, { status: newStatus, updated_at: new Date().toISOString() });
  addLogInternal('USER', id, newStatus === 'ACTIVE' ? 'user_reactivated' : 'user_deactivated', body.performed_by || 'admin', 'Status diubah ke ' + newStatus);
  return { success: true, message: 'Status user berhasil diubah ke ' + newStatus };
}

// ─── Dashboard ───────────────────────────────────────────────────

function getDashboard(params) {
  var issues = sheetToObjects(getSheet(SHEETS.ISSUES));
  var czRecords = sheetToObjects(getSheet(SHEETS.CZ));
  var logs = getLogs({ limit: '10' }).data;

  var today = new Date().toDateString();

  var summary = {
    open: issues.filter(function(i) { return i.status === 'OPEN'; }).length,
    waiting_approval: issues.filter(function(i) { return i.status === 'WAITING_APPROVAL'; }).length,
    solved: issues.filter(function(i) { return i.status === 'SOLVED'; }).length,
    cancelled: issues.filter(function(i) { return i.status === 'CANCELLED'; }).length,
    today: issues.filter(function(i) { return i.created_at && new Date(i.created_at).toDateString() === today; }).length,
    cz_open: czRecords.filter(function(c) { return c.status === 'OPEN'; }).length,
    cz_solved: czRecords.filter(function(c) { return c.status === 'SOLVED'; }).length
  };

  return { success: true, data: { summary: summary, recent_activity: logs } };
}

// ─── Logs ────────────────────────────────────────────────────────

function getLogs(params) {
  var records = sheetToObjects(getSheet(SHEETS.LOGS));
  records.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

  if (params && params.reference_id) {
    records = records.filter(function(l) { return l.reference_id === params.reference_id; });
  }
  if (params && params.reference_type) {
    records = records.filter(function(l) { return l.reference_type === params.reference_type; });
  }

  var limit = parseInt((params && params.limit) || '10');
  return { success: true, data: records.slice(0, limit), total: records.length };
}

function addLog(body) {
  addLogInternal(body.reference_type, body.reference_id, body.action, body.performed_by, body.notes);
  return { success: true };
}

function addLogInternal(refType, refId, action, performedBy, notes) {
  var log = {
    log_id: generateUUID(),
    reference_id: refId, reference_type: refType,
    action: action, performed_by: performedBy || 'system',
    timestamp: new Date().toISOString(),
    notes: notes || ''
  };
  appendRow(SHEETS.LOGS, log);
}

// ─── Response Helpers ────────────────────────────────────────────

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(code, message, status) {
  return jsonResponse({ success: false, error: { code: code, message: message }, status: status || 400 });
}

function generateUUID() {
  return Utilities.getUuid();
}

function uploadPhoto(body) {
  var folderId = PropertiesService.getScriptProperties().getProperty('GOOGLE_DRIVE_FOLDER_ID');
  if (!folderId) {
    return { success: false, error: { code: 'FOLDER_NOT_CONFIGURED', message: 'GOOGLE_DRIVE_FOLDER_ID belum dikonfigurasi di Script Properties.' } };
  }

  if (!body.fileBase64 || !body.mimeType) {
    return { success: false, error: { code: 'BAD_REQUEST', message: 'fileBase64 dan mimeType wajib disertakan.' } };
  }

  try {
    var folder = DriveApp.getFolderById(folderId);
    
    // Dekode base64 ke bentuk Blob
    var fileData = Utilities.base64Decode(body.fileBase64);
    var timestamp = Date.now();
    var filename = body.filename || ('ISSUE_' + timestamp + '.jpg');
    
    var blob = Utilities.newBlob(fileData, body.mimeType, filename);
    var file = folder.createFile(blob);
    
    // Set permission agar siapa saja yang memiliki tautan dapat melihat (Anyone with link can view)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    
    // Format URL direct view/download yang kompatibel
    var photoUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;
    
    return {
      success: true,
      data: {
        fileId: fileId,
        photo_url: photoUrl
      },
      message: 'Foto berhasil disimpan di Google Drive'
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: 'Gagal mengupload berkas ke Drive: ' + err.toString()
      }
    };
  }
}
