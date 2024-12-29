// @nestjs/common v10.x
import { 
  Controller, 
  Post, 
  Body, 
  UnauthorizedException, 
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus
} from '@nestjs/common';

// Internal imports
import { AuthService } from '../../services/auth.service';
import { validateGoogleToken, validateJWTToken } from '../validators/auth.validator';
import { AuthUser } from '../../interfaces/auth.interface';

/**
 * Controller handling authentication endpoints for the SaaS Benchmarks Platform
 * Implements Google OAuth authentication flow and session management for admin users
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticates admin user with Google OAuth
   * Implements the authentication flow defined in technical specifications
   * 
   * @param body Request body containing Google OAuth token
   * @returns Authenticated user data and session token
   * @throws UnauthorizedException for invalid tokens or unauthorized access
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { token: string }
  ): Promise<{ user: AuthUser; accessToken: string }> {
    try {
      // Validate request body
      if (!body.token) {
        throw new BadRequestException('Token is required');
      }

      // Validate Google OAuth token format
      const isValidToken = await validateGoogleToken(body.token);
      if (!isValidToken) {
        throw new UnauthorizedException('Invalid OAuth token');
      }

      // Authenticate with Google OAuth and create session
      const authResult = await this.authService.authenticateWithGoogle(body.token);

      this.logger.log(`User authenticated successfully: ${authResult.user.email}`);
      return authResult;
    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`, error.stack);
      throw error instanceof UnauthorizedException || error instanceof BadRequestException
        ? error
        : new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Verifies JWT session token validity
   * Implements session verification as per security specifications
   * 
   * @param body Request body containing JWT token
   * @returns Verified user data
   * @throws UnauthorizedException for invalid or expired tokens
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyToken(
    @Body() body: { token: string }
  ): Promise<AuthUser> {
    try {
      // Validate request body
      if (!body.token) {
        throw new BadRequestException('Token is required');
      }

      // Validate JWT token format
      const isValidFormat = validateJWTToken(body.token);
      if (!isValidFormat) {
        throw new UnauthorizedException('Invalid token format');
      }

      // Verify session token and get user data
      const user = await this.authService.verifySession(body.token);

      this.logger.log(`Token verified successfully for user: ${user.email}`);
      return user;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`, error.stack);
      throw error instanceof UnauthorizedException || error instanceof BadRequestException
        ? error
        : new UnauthorizedException('Token verification failed');
    }
  }

  /**
   * Logs out user by invalidating their session
   * Implements secure session termination as per specifications
   * 
   * @param body Request body containing user ID
   * @returns Void on successful logout
   * @throws BadRequestException for invalid user ID
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() body: { userId: string }
  ): Promise<void> {
    try {
      // Validate request body
      if (!body.userId) {
        throw new BadRequestException('User ID is required');
      }

      // Invalidate user session
      await this.authService.logout(body.userId);

      this.logger.log(`User logged out successfully: ${body.userId}`);
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`, error.stack);
      throw error instanceof BadRequestException
        ? error
        : new BadRequestException('Logout failed');
    }
  }
}