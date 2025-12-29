const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const path = require('path');
require('dotenv').config();

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

class StorageService {
    /**
     * Uploads a file buffer to S3
     * @param {Buffer} buffer - The file content buffer
     * @param {string} fileName - The desired file name (should include extension)
     * @param {string} mimeType - The MIME type of the file
     * @param {string} folder - The target folder in the bucket (default: 'dishes')
     * @returns {Promise<string>} - The public URL of the uploaded file
     */
    static async uploadFile(buffer, fileName, mimeType, folder = 'dishes') {
        // Ensure unique filename
        const ext = path.extname(fileName) || (mimeType === 'image/jpeg' ? '.jpg' : '.png');
        const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        const key = `${folder}/${uniqueFileName}`;

        const upload = new Upload({
            client: s3,
            params: {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
                Body: buffer,
                ContentType: mimeType
            }
        });

        await upload.done();

        // Return Public URL
        return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    }
}

module.exports = StorageService;
