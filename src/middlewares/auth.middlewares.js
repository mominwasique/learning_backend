import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiErrors.js'
import jwt from 'jsonwebtoken'
import { User } from '../models/user.models.js'


export const verifyJWT = await asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }

        const decodedTokenInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        // await is mandatory in some situation

        const user = await User.findById(decodedTokenInfo?._id).select("-password -refreshToken")

        if (!user) {
            throw new ApiError(402, "Invalid Access Token")
        }

        req.user = user;
        next()


    } catch (error) {
        throw new ApiError(400, error?.message || "Invalid Access Token")
    }
})