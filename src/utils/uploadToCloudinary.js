import cloudinary from "../config/cloudinary.js";

export function uploadToCloudinary(buffer, { folder = "job-board/resumes", publicId } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: "raw" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}