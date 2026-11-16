import { FastifyReply, FastifyRequest } from 'fastify';
import {
  presignedUploadRequestSchema,
  confirmUploadSchema,
} from '@scholaris/validation';
import { DocumentCategory } from '@scholaris/types';
import { DocumentService } from './document.service.js';
import { S3Service } from './s3.service.js';

interface IdParam {
  id: string;
}

interface ListQuery {
  category?: DocumentCategory;
}

export class DocumentController {
  private getService(request: FastifyRequest): DocumentService {
    // S3Service instance can be injected or default instantiated
    const s3Service = (request.server as any).s3Service || new S3Service();
    return new DocumentService(request.server.prisma, s3Service);
  }

  getPresignedUpload = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const input = presignedUploadRequestSchema.parse(request.body);
    const service = this.getService(request);
    const result = await service.generatePresignedUpload(userId, input);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  confirmUpload = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const input = confirmUploadSchema.parse(request.body);
    const service = this.getService(request);
    const result = await service.confirmUpload(userId, input);
    return reply.status(201).send({
      success: true,
      data: result,
    });
  };

  listDocuments = async (
    request: FastifyRequest<{ Querystring: ListQuery }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { category } = request.query;
    const service = this.getService(request);
    const result = await service.listDocuments(userId, category);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  getDownloadUrl = async (
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const service = this.getService(request);
    const result = await service.getDocumentDownloadUrl(userId, id);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  deleteDocument = async (
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const service = this.getService(request);
    await service.deleteDocument(userId, id);
    return reply.status(200).send({
      success: true,
      data: { message: 'Document deleted successfully' },
    });
  };
}
