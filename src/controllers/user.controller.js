import { asyncHandler } from '../utils/asyncHandler.js'


const registerUser = await asyncHandler(async (req, res) => {
    return res.status(200).json({
        message: "Hello World!"
    })
})


export {
    registerUser,
}