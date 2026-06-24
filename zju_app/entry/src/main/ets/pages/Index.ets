import { webview } from '@kit.ArkWeb';
import { promptAction } from '@kit.ArkUI';

// Persist the last successful IP index to avoid "Origin Mismatch" which clears localStorage
PersistentStorage.persistProp('lastSuccessIpIndex', 0);

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController();
  
  // Primary domain URL
  private potentialUrls: string[] = [
    'http://www.tuotuzju.com'
  ];

  @StorageLink('lastSuccessIpIndex') currentIpIndex: number = 0;
  @State url: string = 'http://www.tuotuzju.com'; 
  
  @State isLoading: boolean = true;
  @State isError: boolean = false;
  @State lastBackTime: number = 0;
  @State hasLoadedSuccessfully: boolean = false;

  private timeoutId: number = -1;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private isRetryScheduled: boolean = false;

  aboutToAppear() {
    // Initialize URL based on persisted index
    this.url = this.potentialUrls[this.currentIpIndex] || this.potentialUrls[0];

    try {
      webview.WebviewController.setWebDebuggingAccess(true);
      // Enable cookies and persistence
      webview.WebCookieManager.putAcceptCookieEnabled(true);
      webview.WebCookieManager.putAcceptThirdPartyCookieEnabled(true);
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  }

  aboutToDisappear() {
    this.clearTimeout();
  }

  onBackPress(): boolean {
    if (this.controller.accessBackward()) {
      this.controller.backward();
      return true;
    }

    const currentTime = new Date().getTime();
    if (currentTime - this.lastBackTime < 2000) {
      return false;
    } else {
      this.lastBackTime = currentTime;
      promptAction.showToast({
        message: '再按一次退出应用',
        duration: 2000
      });
      return true;
    }
  }

  retryNextIp() {
    if (this.isRetryScheduled) {
      return;
    }
    this.isRetryScheduled = true;
    this.clearTimeout();
    
    if (this.hasLoadedSuccessfully) {
      console.info(`[Retry] Already loaded successfully, ignoring retry request`);
      this.isRetryScheduled = false;
      return;
    }
    
    if (this.retryCount >= this.maxRetries) {
      console.error(`[Retry] Max retries (${this.maxRetries}) reached, showing error`);
      this.isLoading = false;
      this.isError = true;
      this.isRetryScheduled = false;
      return;
    }

    this.retryCount++;
    console.info(`[Auto-Retry] Attempt ${this.retryCount}/${this.maxRetries}: ${this.url}`);
    
    this.isError = false;
    this.isLoading = true;
    
    setTimeout(() => {
      this.isRetryScheduled = false;
      this.controller.loadUrl(this.url);
    }, 500);
  }

  clearTimeout() {
    if (this.timeoutId !== -1) {
      clearTimeout(this.timeoutId);
      this.timeoutId = -1;
    }
  }

  startLoadingTimeout() {
    this.clearTimeout();
    // If loading takes longer than 3 seconds, consider it a timeout and switch
    this.timeoutId = setTimeout(() => {
      console.error(`[Timeout] Loading ${this.url} took too long, retrying next...`);
      this.retryNextIp();
    }, 12000); 
  }

  build() {
    Stack() {
      Web({ src: this.url, controller: this.controller })
        .domStorageAccess(true)
        .databaseAccess(true)
        .imageAccess(true)
        .javaScriptAccess(true)
        .fileAccess(true)
        .mixedMode(MixedMode.All)
        .cacheMode(CacheMode.Default)
        .multiWindowAccess(true) 
        .allowWindowOpenMethod(true)
        .width('100%')
        .height('100%')
        .metaViewport(true)
        .onPageBegin(() => {
          this.isRetryScheduled = false;
          this.isLoading = true;
          this.isError = false;
          this.startLoadingTimeout();
        })
        .onPageEnd(() => {
          this.isLoading = false;
          this.hasLoadedSuccessfully = true;
          this.retryCount = 0;
          this.isRetryScheduled = false;
          this.clearTimeout();
        })
        .onErrorReceive((event) => {
          if (event && event.request.isMainFrame() && !this.hasLoadedSuccessfully) {
             console.error(`[Connection Failed] ${this.url} - ${event.error.getErrorInfo()}`);
             this.retryNextIp();
          }
        })
        .onHttpErrorReceive((event) => {
          if (event && event.request?.isMainFrame() && event.response.getResponseCode() >= 500 && !this.hasLoadedSuccessfully) {
             console.error(`HTTP Error: ${event.response.getResponseCode()}`);
             this.retryNextIp();
          }
        })
        .onRenderExited((event) => {
          console.error(`WebView Render Exited: ${event?.renderExitReason}`);
          this.hasLoadedSuccessfully = false;
          this.retryNextIp();
        })
        .onShowFileSelector((event) => {
          return false; 
        })
        .onWindowNew((event) => {
          if (event) {
             const targetUrl = event.targetUrl;
             event.handler.setWebController(null); 
             this.controller.loadUrl(targetUrl);
          }
        })
        .onAlert((event) => {
          if (event) {
            promptAction.showDialog({
              title: '提示',
              message: event.message,
              buttons: [{ text: '确定', color: '#000000' }]
            });
            return true;
          }
          return false;
        });

      if (this.isLoading && !this.hasLoadedSuccessfully) {
        Column() {
           LoadingProgress()
            .width(60)
            .height(60)
            .color(Color.Blue)
           Text(`正在连接服务器...\n(${this.url})`)
            .fontSize(12)
            .fontColor(Color.Gray)
            .textAlign(TextAlign.Center)
            .margin({ top: 10 })
        }
        .width('100%')
        .height('100%')
        .backgroundColor(Color.White)
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
        .hitTestBehavior(HitTestMode.None)
      }

      if (this.isError) {
        Column() {
           Text('⚠️')
            .fontSize(48)
           Text('连接失败')
            .fontSize(20)
            .fontColor(Color.Black)
            .margin({ top: 16 })
           Text('无法连接到服务器，请检查网络后重试')
            .fontSize(14)
            .fontColor(Color.Gray)
            .margin({ top: 8 })
           Button('重试')
            .margin({ top: 24 })
            .onClick(() => {
              this.retryCount = 0;
              this.isRetryScheduled = false;
              this.hasLoadedSuccessfully = false;
              this.isError = false;
              this.isLoading = true;
              this.controller.loadUrl(this.url);
            })
        }
        .width('100%')
        .height('100%')
        .backgroundColor(Color.White)
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
      }
    }
  }
}
