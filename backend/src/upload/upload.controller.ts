import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { JwtAuthGuard } from "../auth/jwt.guard";

@UseGuards(JwtAuthGuard)
@Controller("upload")
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: join(process.cwd(), "uploads"), // OK

        filename: (_, file, callback) => {
          const unique =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

          callback(
            null,
            `${unique}${extname(file.originalname)}`
          );
        },
      }),
    })
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      url: `http://localhost:3001/uploads/${file.filename}`,
    };
  }
}