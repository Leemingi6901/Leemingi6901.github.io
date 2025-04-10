const fs = require('fs');
const path = require('path');

const DATA_FILE = '/tmp/views.json'; // Netlify의 임시 저장 경로

exports.handler = async function (event) {
  const slug = event.queryStringParameters.slug;
  if (!slug) {
    return {
      statusCode: 400,
      body: 'Missing slug parameter'
    };
  }

  let data = {};
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE);
      data = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read file:', err);
  }

  // 기존 조회수 불러오기
  const current = data[slug] || 0;
  data[slug] = current + 1;

  // 저장
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to write file:', err);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ views: data[slug] }),
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  };
};
