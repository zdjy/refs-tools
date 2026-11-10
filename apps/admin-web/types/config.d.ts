export interface IBodySetting {
  fixed: boolean;
}

export interface IHeaderSetting {
  fixed: boolean;
}

export interface IMenuSetting {
  minMenuWidth: number;
  menuWidth: number;
  fixed: boolean;
  mobileWidth: number;
}

export interface ICrumbsSetting {
  show: boolean;
  showIcon: boolean;
}

export interface GlobConfig {
  title: string;
  apiUrl: string;
  shortName: string;
  urlPrefix?: string;
  uploadUrl?: string;
  fileUrl?: string;
}

export interface LocalConfig {
  // 生产环境开启 mock
  useMock: boolean;
  // 打印 mock 请求信息
  loggerMock: boolean;
}

export interface GlobEnvConfig {
  // 标题
  VITE_GLOB_APP_TITLE: string;
  // 接口地址
  VITE_GLOB_API_URL: string;
  // 接口前缀
  VITE_GLOB_API_URL_PREFIX?: string;
  // 网站别名
  VITE_GLOB_APP_SHORT_NAME: string;
  // 文件上传地址
  VITE_GLOB_UPLOAD_URL?: string;
  // 文件前缀地址
  VITE_GLOB_FILE_URL?: string;
  // 开启 mock
  VITE_USE_MOCK: string;
  // 是否开启控制台打印 mock 请求信息
  VITE_LOGGER_MOCK: string;
}
