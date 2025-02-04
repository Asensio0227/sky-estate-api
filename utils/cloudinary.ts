import cloudinary from 'cloudinary';

export function imageUpload(file: any): Promise<{ id: string; url: string }> {
  return new Promise((resolve, reject) => {
    try {
      const uploadOptions: any = {
        resource_type: 'auto',
        overwrite: true,
        folder: 'skybank',
      };
      cloudinary.v2.uploader
        .upload_stream(uploadOptions, (error, result) => {
          if (result && result.secure_url) {
            console.log(`===cloudinary.v2.uploader.upload=====`);
            console.log(result);
            console.log(`===cloudinary.v2.uploader.upload=====`);
            const { secure_url, publicId } = result;
            resolve({ url: secure_url, id: publicId });
          }
          return reject({ message: error });
        })
        .end(file.buffer);
    } catch (error: any) {
      console.log(error);
    }
  });
}
