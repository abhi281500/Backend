import  {asyncHandler} from '../utils/asyncHandler.js' ;
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken"

const generateAcessAndRefreshTokens = async(userId)=>{
    try {
      const user =  await User.findById(userId)
     const accessToken= user.generateAcessToken()
    const refreshToken =  user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave : false})

     return { accessToken,refreshToken} 

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh & access token")
    }
}



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

    const existedUser = await User.findOne({
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


   console.log(req.files)

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

const loginUser = asyncHandler(async (req,res)=>{
// req body -> data 
// username or email
// find the user
// password check 
// access and refresh token 
// send cookies
const {email,username,password} = req.body


// !(username || email) agar ek lena hota toh 



if (!username && !email) {
    throw new ApiError(400, "username Or email is required")
}

const user =await User.findOne({
   $or: [{username}, {email}]
})

if(!user){
    throw new ApiError(404, "User does not exist")
}

const isPasswordValid= await user.isPasswordCorrect(password)

if(!isPasswordValid){
    throw new ApiError(401,"Invalid user credential")
}

const   {accessToken,refreshToken}= await generateAcessAndRefreshTokens(user._id)

const  loggedInUser= await User.findById(user._id).select("-password -refreshToken")



const options = {
    httpOnly :true,
    secure : true
}

return res
.status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options)
.json(
    new ApiResponse(
        200,
        {
            user : loggedInUser,accessToken,refreshToken
        },
        "User logged in Succesfully"
    )
)





})


const logoutUser = asyncHandler(async(req,res) =>{
  await  User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res 
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{} ,"User Logged Out")
    )
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefreshToken=  req.cookies.refreshToken || req.body

  if(!incomingRefreshToken){
    throw new ApiError(401,"unauthorized Request")
  }

try {
     const decodedToken =  jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
      )
    
    
     const user= await User.findById(decodedToken?._id)
    
     if(!user){
        throw new ApiError(401, "invalid Refresh token")
     }
    
     if(incomingRefreshToken !==user?.refreshToken){
        throw new ApiError(401 , "Refresh token is expired or used")
     }
    
    const options = {
        httpOnly : true,
        secure : true
    }
    
     const {accessToken,newRefreshToken} =await  generateAcessAndRefreshTokens(user._id)
    
    return res
    .status(200)
    .cookie("accessToken",accessToken ,options)
    .cookie("refreshToken" ,newRefreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                accessToken,refreshToken :newRefreshToken
            },
            "Access token refreshed"
    
        )
    )
} catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
}

 
})

export {registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken
}