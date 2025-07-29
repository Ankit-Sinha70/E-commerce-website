import mongoose, {Schema } from "mongoose";
import bcrypt from 'bcryptjs'
const userSchema = new Schema({
    name:{
        type:String,
        required: true,
        lowercase: true,
        trim: true, 
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
    },
    password:{
        type:String,
        required:true
    },
    address:{
        type:String,
    },
    avatar:{
        type:String,
        default:null
    },
    avatarPublicId :{
        type:String,
        default:null,
        select: false,
    },
    role:{
        type:String,
        enum:['admin','user', 'delivery'],
        default:'user'
    },
    status:{
        type:String,
        enum:['Active','Inactive'],
        default:'Active'
    },
    refreshtoken:{
        type:String
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
},
{timestamps:true}
)

userSchema.pre('save',async function encryptpassword(next){

    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password,10)

})

userSchema.methods.getResetPasswordToken = function() {
    const resetToken = bcrypt.randomBytes(20).toString('hex');

    this.resetPasswordToken = bcrypt.createHash('sha256').update(resetToken).digest('hex');

    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

export const User = mongoose.model("User",userSchema)