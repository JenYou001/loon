const body = JSON.stringify({ code: 200, data: {} });

$done({
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': body.length.toString()
  },
  body: body
});