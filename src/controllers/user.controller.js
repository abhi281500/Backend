import  {asyncHandler} from '../utils/asyncHandler.js' ;
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';


const registerUser = asyncHandler( async(req,res) =>{
    // get user details from frontend 
    // validate the user details
    // check if user already exists - username or email
    // check for image, check for avatar
    // uplaod the image to cloudinary 
    // create user object - create entry in database
    // remove password & refresh token field from the response
    // check for user creation success 
    // return response 

    const {fullname,email,password,username} = req.body ;

    console.log("req.body",req.body);
    console.log("fullname",fullname);
    console.log("email",email);
    console.log("password",password);
    console.log("username",username);


    if(
        [fullname,email,password,username].some(field => !field || field.trim() === "")
    )
    {
        throw new ApiError(400,"All fields are required")
    }

    const existedUser =User.findOne({
        $or :[
            {email},
            {username}  
        ]
    })

    if(existedUser){
        throw new ApiError(409,"User already exists with this email or username")
    }


   const avatarLocalPath = req.files?.avatar?.[0]?.path
   const  coverImageLocalPath = req.files?.coverImage?.[0]?.path

   if(!avatarLocalPath){
    throw new ApiError(400,"Avatar image is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar){
    throw new ApiError(500,"Failed to upload avatar image")
   }    
   
    const user = await User.create({    
        fullname,
        email,
        password,
        username : username.toLowerCase(),
        avatar : avatar.url,
        coverImage : coverImage?.url || ""
    })  

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Failed to create user")
    }

    return res.status(201).json(
       new ApiResponse(201,"User registered successfully",createdUser)
)

})


export {registerUser}