export function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));
    const errors = validations
      .map((v) => v.formatter?.(v))
      .filter(Boolean);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
      });
    }

    return next();
  };
}
