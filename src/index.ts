import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 HubSpot Renewal Health App running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 OAuth: http://localhost:${PORT}/oauth/authorize`);
  console.log(`📈 API docs: http://localhost:${PORT}/`);
});
