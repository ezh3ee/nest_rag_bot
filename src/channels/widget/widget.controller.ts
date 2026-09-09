import { Controller, Param, Post } from '@nestjs/common';

type WidgetParams = {
  message: string;
};

@Controller('widget')
export class WidgetController {
  @Post('message')
  onChatMessage(@Param() params: WidgetParams): string {
    console.log(params);
    return params.message;
  }
}
