import Joi from "joi";

// Input validation schemas
export const gameSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().trim(),
  genre: Joi.string().min(1).max(100).required().trim(),
  rating: Joi.number().min(0).max(10).precision(1).required(),
  price: Joi.number().min(0).max(9999.99).precision(2).required(),
  description: Joi.string().max(1000).allow("", null).trim(),
  releaseDate: Joi.alternatives()
    .try(Joi.date().iso(), Joi.string().allow("", null))
    .allow(null),
  platform: Joi.string().max(100).allow("", null).trim(),
}).options({ stripUnknown: true });

export const idSchema = Joi.string().uuid().required();
