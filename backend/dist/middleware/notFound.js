export const notFoundMiddleware = (_req, res, _next) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        timestamp: new Date().toISOString(),
    });
};
