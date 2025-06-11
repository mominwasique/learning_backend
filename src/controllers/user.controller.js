
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiErrors.js"
import { User } from "../models/user.models.js"
import { uploadFileOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from 'jsonwebtoken'
import { use } from "react"


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}

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
    // console.log("username: ", username);
    // console.log("password: ", password);

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

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "email or username already exists")
    }

    console.log(req.files);


    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

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


const loginUser = await asyncHandler(async (req, res) => {
    // req body -> data
    // login user by username or email
    // find the user is existed or not
    // if user found then check password
    // generate access and refresh token
    // send the both tokens by using cookies


    const { email, username, password } = req.body

    if (!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist ")
    }

    const isPassworValid = await user.isPasswordCorrect(password)

    if (!isPassworValid) {
        throw new ApiError(402, "Invalid Credentials ")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.
        status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User Logged In Successfully"
            )
        )



})

const logoutUser = await asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User Logged Out Successfully")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(402, "Invalid Refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(404, "Refresh Token is expired ")
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token Refreshed Successfully"
                )
            )
    } catch (error) {
        throw new ApiError(402, error?.message || "Invalid Refresh Token")
    }


})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}