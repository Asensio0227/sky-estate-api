// {
//     first_name: {
//       type: String,
//       required: [true, 'Please provide your name'],
//       minlength: 5,
//       maxlength: 20,
//       trim: true,
//     },
//     last_name: {
//       type: String,
//       required: [true, 'Please provide your surname'],
//       minlength: 3,
//       maxlength: 20,
//       trim: true,
//     },
//     gender: {
//       type: String,
//       required: [true, 'Please provide your gender'],
//       minlength: 2,
//       maxlength: 50,
//       trim: true,
//     },
//     ideaNumber: {
//       type: String,
//       required: [true, 'Please provide your Idea Number'],
//       minlength: 5,
//       maxlength: 20,
//       trim: true,
//       unique: true,
//     },
//     avatar: {
//       type: String,
//     },
//     email: {
//       type: String,
//       unique: true,
//       required: [true, 'Please provide your email address'],
//       validate: {
//         validator: validator.isEmail,
//         message: 'Please provide your email address',
//       },
//     },
//     expoToken: {
//       type: String,
//     },
//     date_of_birth: {
//       type: String,
//       required: [true, 'Please provide your date of birth'],
//     },
//     address: {
//       street: {
//         type: String,
//         required: [true, 'Please provide your street'],
//       },
//       city: {
//         type: String,
//         required: [true, 'Please provide your city'],
//       },
//       province: {
//         type: String,
//         required: [true, 'Please provide your state'],
//       },
//       postal_code: {
//         type: String,
//         required: [true, 'Please provide your zip code'],
//       },
//       country: {
//         type: String,
//         required: [true, 'Please provide your country'],
//       },
//     },
//     contact_details: {
//       phone_number: {
//         type: String,
//         required: [true, 'Please provide your phone number'],
//       },
//       email: {
//         type: String,
//         required: [true, 'Please provide your email address'],
//         unique: true,
//         match: [/.+@.+\..+/, 'Please enter a valid email address'],
//       },
//     },
//     status: {
//       type: String,
//       enum: ['online', 'offline'],
//       default: 'offline',
//     },
//     banned: {
//       type: Boolean,
//       default: false,
//     },
//     password: {
//       type: String,
//       required: [true, 'Please provide your password'],
//       minlength: 6,
//     },
//     role: {
//       type: String,
//       enum: ['admin', 'user', 'member', 'assistant'],
//       default: 'user',
//     },
//     verified: {
//       type: Date,
//     },
//     passwordTokenExpirationDate: {
//       type: Date,
//     },
//     isVerified: {
//       type: Boolean,
//       default: false,
//     },
//     passwordToken: {
//       type: Number,
//     },
//     verificationToken: {
//       type: Number,
//     },
//   },
//   { timestamps: true }
