const express = require('express');
const bodyParser = require('body-parser');
const pdfRoutes = require('../routes/pdf');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

const app = express();
app.use(bodyParser.json());
app.use('/api/pdf', pdfRoutes);

// 动态生成 Swagger options
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PDF to Markdown',
      version: '1.0.0',
      description: 'API for parsing online PDF files into Markdown format',
    },
    servers: [],
  },
  apis: ['./routes/*.js'],
};

// Middleware to dynamically set the swagger server URL
app.use((req, res, next) => {
  const protocol = req.protocol;
  const host = req.get('host');
  const serverUrl = `${protocol}://${host}`;
  swaggerOptions.definition.servers = [
    { url: serverUrl },
  ];

  const swaggerSpec = swaggerJsDoc(swaggerOptions);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});