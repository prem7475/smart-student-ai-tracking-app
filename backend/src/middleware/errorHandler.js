const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error(error);

  if (error.code === 11000) {
    return res.status(409).json({
      message: "Duplicate record",
      fields: Object.keys(error.keyPattern || {}),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid identifier format" });
  }

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    message: error.message || "Internal server error",
  });
};

module.exports = errorHandler;
