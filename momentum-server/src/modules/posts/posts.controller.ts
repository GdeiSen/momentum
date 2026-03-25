import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types';

@ApiTags('Posts')
@Controller('teams/:teamId/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to create posts' })
  async create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.postsService.create(teamId, user.id, createPostDto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all posts for a team' })
  @ApiResponse({ status: 200, description: 'List of posts' })
  @ApiResponse({ status: 403, description: 'Not authorized to view posts' })
  async findAll(
    @Param('teamId') teamId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.postsService.findAllByTeam(teamId, user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':postId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get post by ID' })
  @ApiResponse({ status: 200, description: 'Post data' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 403, description: 'Not authorized to view post' })
  async findById(
    @Param('teamId') teamId: string,
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postsService.findById(postId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':postId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a post' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to update post' })
  async update(
    @Param('teamId') teamId: string,
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(postId, user.id, updatePostDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':postId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete post' })
  async delete(
    @Param('teamId') teamId: string,
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postsService.delete(postId, user.id);
  }
}




