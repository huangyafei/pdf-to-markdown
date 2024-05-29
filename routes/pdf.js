const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const router = express.Router();
const fs = require('fs');
const tmp = require('tmp');

const API_KEY = process.env.API_KEY;

/**
 * @openapi
 * /api/pdf/parse:
 *   post:
 *     description: Uploads a PDF file and returns parsed markdown text.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pdfUrl:
 *                 type: string
 *                 description: URL of the PDF file to be parsed
 *                 example: "https://example.com/sample.pdf"
 *     responses:
 *       200:
 *         description: Successfully parsed the PDF file.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 markdown:
 *                   type: string
 *                   description: Parsed markdown content of the PDF.
 *       500:
 *         description: Error occurred while processing the PDF file.
 */
router.post('/parse', async (req, res) => {
  try {
    const { pdfUrl } = req.body;

    const response = await axios({
      url: pdfUrl,
      method: 'GET',
      responseType: 'stream',
    });

    const tempFile = tmp.fileSync({ postfix: '.pdf' });
    const writer = fs.createWriteStream(tempFile.name);

    response.data.pipe(writer);

    writer.on('finish', async () => {
      const form = new FormData();
      form.append('file', fs.createReadStream(tempFile.name));

      try {
        const uploadResponse = await axios.post('https://api.cloud.llamaindex.ai/api/parsing/upload', form, {
          headers: {
            ...form.getHeaders(),
            'Accept': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
          }
        });

        const jobId = uploadResponse.data.id;

        setTimeout(async () => {
          try {
            const resultResponse = await axios.get(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
              }
            });

            const markdown = resultResponse.data.markdown;

            res.status(200).json({ markdown });
            
            tempFile.removeCallback();
          } catch (error) {
            res.status(500).json({ message: 'Error fetching the parsing result', error: error.message });
          }
        }, 5000);

      } catch (error) {
        res.status(500).json({ message: 'Error uploading the PDF file', error: error.message });
      }
    });

    writer.on('error', (error) => {
      res.status(500).json({ message: 'Error downloading the PDF file', error: error.message });
    });

  } catch (error) {
    res.status(500).json({ message: 'Error downloading the PDF file', error: error.message });
  }
});

module.exports = router;