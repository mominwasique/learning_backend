
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiErrors.js"
import { User } from "../models/user.models.js"
import { uploadFileOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = await asyncHandler(async (req, res) => {

    // get user details from frontend
    // validation - no empty fields
    // check user is already exists or not : username or email
    // check for avatar and images
    // if avatar and images are available, upload them to cloudinary and check avatar is uploaded or not on cloudinary 
    // create user object - create entry in db using create method
    // remove password and refresh token field from response
    // check user is created or not
    // return response if user is created successfully.


    const { username, email, fullName, password } = req.body
    console.log("email: ", email);
    console.log("username: ", username);
    console.log("password: ", password);

    // checking one by one using if method
    // if (username === "") {
    //     throw new ApiError(400, "username is required")
    // }


    // checking using some method
    if (
        [username, email, fullName, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadFileOnCloudinary(avatarLocalPath)
    const coverImage = await uploadFileOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        username: username.toLowerCase(),
        fullName,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )



})


export {
    registerUser,
}