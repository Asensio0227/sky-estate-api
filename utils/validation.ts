import Joi from 'joi';

export const createEstateValidation = Joi.object({
  title: Joi.string().min(5).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  price: Joi.number().min(1).when('listingType', {
    is: 'sale',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  listingType: Joi.string().valid('sale', 'rent').required(),
  rentPrice: Joi.number().min(1).when('listingType', {
    is: 'rent',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  rentFrequency: Joi.string()
    .valid('daily', 'weekly', 'monthly', 'yearly')
    .when('listingType', {
      is: 'rent',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
  depositAmount: Joi.number().min(0),
  availableFrom: Joi.date(),
  isFurnished: Joi.boolean(),
  minimumStay: Joi.number().min(1),
  location: Joi.object({
    type: Joi.string().valid('Point').required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
  }).required(),
  category: Joi.string()
    .valid('Apartments', 'Houses', 'Condos', 'Villas', 'Land')
    .required(),
  contact_details: Joi.object({
    phone_number: Joi.string(),
    email: Joi.string().email(),
    address: Joi.string(),
  }),
});

export const updateLocationValidation = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
});

export const searchEstatesValidation = Joi.object({
  listingType: Joi.string().valid('sale', 'rent'),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  rentFrequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly'),
  isFurnished: Joi.boolean(),
  bedrooms: Joi.number().min(0),
  bathrooms: Joi.number().min(0),
  availableFrom: Joi.date(),
  distance: Joi.number().min(1).max(100), // km
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  page: Joi.number().min(1),
  limit: Joi.number().min(1).max(100),
});
