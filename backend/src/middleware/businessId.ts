import { NextFunction, Request, Response } from 'express';

export interface BusinessRequest extends Request {
  businessId: string;
}

const DEFAULT_BUSINESS_ID = 'demo-business-001';

export function businessIdMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const headerValue = req.headers['x-business-id'];
  const normalizedHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const businessId =
    typeof normalizedHeader === 'string' && normalizedHeader.trim()
      ? normalizedHeader.trim()
      : DEFAULT_BUSINESS_ID;

  (req as BusinessRequest).businessId = businessId;
  next();
}

export function getBusinessId(req: Request) {
  return (req as BusinessRequest).businessId || DEFAULT_BUSINESS_ID;
}
