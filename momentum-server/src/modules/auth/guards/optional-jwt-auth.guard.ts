import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    // No error is thrown if no user is found.
    // user will be false/null if authentication fails or is missing.
    return user || null;
  }
}
