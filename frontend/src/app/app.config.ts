import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { customInterceptor } from './middleware/customInterceptor/custom.interceptor';
import { provideToastr } from 'ngx-toastr';
import { provideQuillConfig } from 'ngx-quill/config';
import { authInterceptor } from './middleware/authInterceptor/auth.interceptor';
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([customInterceptor, authInterceptor])),
    provideAnimationsAsync(),
    provideToastr(),
    provideQuillConfig({
      customOptions: [{
        import: 'formats/font',
        whitelist : ['Arial','DancingScript','Satisfy','KaushanScript','Tangerine','Mynerve','Playball','Sofia','Slabo','Pacifico','Kalam','Caveat','Sacramento','Sevillana','IndieFlower']
      },{
        import:'attributors/style/size',
        whitelist:['8px','9px','10px','12px','14px','16px','20px','24px','32px','42px','54px','68px','84px','98px']
      }
    ],
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'header': 1 }], 
          [{ 'size': ['8px','9px','10px','12px','14px','16px','20px','24px','32px','42px','54px','68px','84px','98px'] }],
          [{ 'font': ['Arial','DancingScript','Satisfy','KaushanScript','Tangerine','Mynerve','Playball','Sofia','Slabo','Pacifico','Kalam','Caveat','Sacramento','Sevillana','IndieFlower']}],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'align': [] }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          ['clean']
        ],
      },
      theme: 'snow',
      placeholder: 'Type your content here...',
      readOnly: false
    })
  ]
};
