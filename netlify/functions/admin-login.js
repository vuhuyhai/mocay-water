const { configured, checkPassword, makeToken } = require("./_lib/auth");

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!configured()) {
    return { statusCode: 200, headers, body: JSON.stringify({ configured: false }) };
  }
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch (e) {}
  if (!checkPassword(body.password)) {
    return { statusCode: 401, headers, body: JSON.stringify({ configured: true, ok: false }) };
  }
  return { statusCode: 200, headers, body: JSON.stringify({ configured: true, ok: true, token: makeToken() }) };
};
