const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const path = require('path');
require('dotenv').config();

// Configure AWS S3
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed!'));
    }
});

// Upload function to S3
const uploadToS3 = async (file, folder = 'dishes') => {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;

    const upload = new Upload({
        client: s3,
        params: {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `${folder}/${fileName}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            // ACL: 'public-read' // Check if bucket allows ACLs. Usually better to use Bucket Policy.
        }
    });

    try {
        const result = await upload.done();
        // Construct public URL. If bucket is public:
        return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${folder}/${fileName}`;
        // Or result.Location if returned.
    } catch (error) {
        console.error('S3 Upload Error:', error); // Log the full error
        console.error('AWS Config:', {
            region: process.env.AWS_REGION,
            bucket: process.env.AWS_BUCKET_NAME,
            keyId: process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Missing'
        });
        throw new Error(`S3 Upload Failed: ${error.message}`);
    }
};

module.exports = { upload, uploadToS3 };
