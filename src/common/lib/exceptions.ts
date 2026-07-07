export class HttpException extends Error {
  constructor(public message: string, public status: number) {
    super(message);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string = "Bad Request") {
    super(message, 400);
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = "Not Found") {
    super(message, 404);
  }
}
