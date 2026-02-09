import { v2 as cloudinary } from "cloudinary";
import fs from "fs";


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localfilePath, options = {}) => {
    try {
        if(!localfilePath) throw new Error("File path is required");

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localfilePath,{
            resource_type: "auto",
        });
        

        // file has been uploaded successfully, now delete the local file
       console.log("File has been uploaded on cloudinary",response.url);
       console.log(response);
       
       return response;
       
    } catch (error) {
        // delete the local file if it exists

        fs.unlinkSync(localfilePath); 
        return null;
    }
}

export {uploadOnCloudinary}