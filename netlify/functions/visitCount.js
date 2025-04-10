const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const client = new BetaAnalyticsDataClient();

const GA_PROPERTY_ID = '5781472024'; // Daniel님의 GA4 스트림 ID

exports.handler = async function () {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];

  try {
    const [todayResponse] = await client.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: dateString, endDate: dateString }],
      metrics: [{ name: 'screenPageViews' }]
    });

    const [totalResponse] = await client.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '2020-01-01', endDate: 'today' }],
      metrics: [{ name: 'screenPageViews' }]
    });

    const todayCount = todayResponse.rows?.[0]?.metricValues?.[0]?.value || '0';
    const totalCount = totalResponse.rows?.[0]?.metricValues?.[0]?.value || '0';

    return {
      statusCode: 200,
      body: JSON.stringify({ today: todayCount, total: totalCount }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
