package com.tuotuzju.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebView.WebViewTransport;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

public class AppWebViewActivity extends Activity {
    private static final String TAG = "AppWebViewActivity";
    private static final int FILE_CHOOSER_REQUEST_CODE = 1101;
    private static final String APP_USER_AGENT_SUFFIX = " TuotuZjuApp/8";

    private FrameLayout rootView;
    private WebView webView;
    private WebView popupWebView;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);

        rootView = new FrameLayout(this);
        webView = new WebView(this);
        rootView.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(rootView);

        configureWebView(webView);
        webView.loadUrl(resolveInitialUrl().toString());
    }

    private void configureWebView(WebView view) {
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportMultipleWindows(true);
        appendAppUserAgent(settings);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
            CookieManager.getInstance().setAcceptThirdPartyCookies(view, true);
        }

        view.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest request) {
                return openExternallyIfNeeded(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView webView, String url) {
                return openExternallyIfNeeded(Uri.parse(url));
            }
        });

        view.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(
                    WebView sourceView,
                    boolean isDialog,
                    boolean isUserGesture,
                    Message resultMsg) {
                Log.i(TAG, "Creating in-app popup WebView.");

                closePopupWebView();

                popupWebView = new WebView(AppWebViewActivity.this);
                popupWebView.setVisibility(View.VISIBLE);
                configureWebView(popupWebView);
                rootView.addView(popupWebView, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));

                popupWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        Uri uri = request.getUrl();
                        if (isTuotuzjuWebUrl(uri)) {
                            webView.loadUrl(normalizeAppUrl(uri).toString());
                            closePopupWebView();
                            return true;
                        }
                        boolean handled = openExternallyIfNeeded(uri);
                        if (handled) {
                            closePopupWebView();
                        }
                        return handled;
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, String url) {
                        Uri uri = Uri.parse(url);
                        if (isTuotuzjuWebUrl(uri)) {
                            webView.loadUrl(normalizeAppUrl(uri).toString());
                            closePopupWebView();
                            return true;
                        }
                        boolean handled = openExternallyIfNeeded(uri);
                        if (handled) {
                            closePopupWebView();
                        }
                        return handled;
                    }
                });

                WebViewTransport transport = (WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWebView);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public void onCloseWindow(WebView window) {
                closePopupWebView();
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                showJsMessageDialog(message, result);
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                showJsConfirmDialog(message, result);
                return true;
            }

            @Override
            public boolean onJsPrompt(
                    WebView view,
                    String url,
                    String message,
                    String defaultValue,
                    JsPromptResult result) {
                showJsPromptDialog(message, defaultValue, result);
                return true;
            }

            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams fileChooserParams) {
                Log.i(TAG, "Opening file chooser for upload. accept="
                        + formatAcceptTypes(fileChooserParams.getAcceptTypes())
                        + " capture=" + fileChooserParams.isCaptureEnabled()
                        + " mode=" + fileChooserParams.getMode());

                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                Intent chooserIntent = buildFileChooserIntent(fileChooserParams);
                try {
                    startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST_CODE);
                    return true;
                } catch (ActivityNotFoundException exception) {
                    Log.e(TAG, "No file chooser activity found.", exception);
                    filePathCallback = null;
                    callback.onReceiveValue(null);
                    Toast.makeText(AppWebViewActivity.this, "No file picker available", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        view.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(
                    String url,
                    String userAgent,
                    String contentDisposition,
                    String mimetype,
                    long contentLength) {
                openExternallyIfNeeded(Uri.parse(url));
            }
        });
    }

    private Intent buildFileChooserIntent(WebChromeClient.FileChooserParams fileChooserParams) {
        try {
            Intent intent = fileChooserParams.createIntent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,
                        fileChooserParams.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);
            }
            return intent;
        } catch (RuntimeException exception) {
            Log.w(TAG, "Falling back to generic content picker.", exception);
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "video/*"});
            return Intent.createChooser(intent, "Select file");
        }
    }

    private void appendAppUserAgent(WebSettings settings) {
        String userAgent = settings.getUserAgentString();
        if (userAgent == null || userAgent.contains("TuotuZjuApp/")) {
            return;
        }
        settings.setUserAgentString(userAgent + APP_USER_AGENT_SUFFIX);
    }

    private String formatAcceptTypes(String[] acceptTypes) {
        if (acceptTypes == null || acceptTypes.length == 0) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        for (String acceptType : acceptTypes) {
            if (acceptType == null || acceptType.length() == 0) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append(',');
            }
            builder.append(acceptType);
        }
        return builder.toString();
    }

    private void showJsMessageDialog(String message, final JsResult result) {
        new AlertDialog.Builder(this)
                .setMessage(message)
                .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                .setOnCancelListener(dialog -> result.cancel())
                .show();
    }

    private void showJsConfirmDialog(String message, final JsResult result) {
        new AlertDialog.Builder(this)
                .setMessage(message)
                .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                .setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel())
                .setOnCancelListener(dialog -> result.cancel())
                .show();
    }

    private void showJsPromptDialog(String message, String defaultValue, final JsPromptResult result) {
        final EditText input = new EditText(this);
        input.setSingleLine(false);
        input.setText(defaultValue);
        input.setSelectAllOnFocus(true);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setMessage(message)
                .setView(input)
                .setPositiveButton(android.R.string.ok, null)
                .setNegativeButton(android.R.string.cancel, (d, which) -> result.cancel())
                .setOnCancelListener(d -> result.cancel())
                .create();

        dialog.setOnShowListener(new DialogInterface.OnShowListener() {
            @Override
            public void onShow(DialogInterface dialogInterface) {
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
                    result.confirm(input.getText().toString());
                    dialog.dismiss();
                });
                input.requestFocus();
                InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) {
                    imm.showSoftInput(input, InputMethodManager.SHOW_IMPLICIT);
                }
            }
        });

        dialog.show();
    }

    private Uri resolveInitialUrl() {
        Uri uri = getIntent().getData();
        if (uri != null && isWebUrl(uri)) {
            return normalizeAppUrl(uri);
        }
        return Uri.parse(getString(R.string.launchUrl));
    }

    private boolean openExternallyIfNeeded(Uri uri) {
        if (uri == null) {
            return false;
        }

        if (isTuotuzjuDownloadUrl(uri)) {
            if (webView != null) {
                webView.loadUrl(getString(R.string.launchUrl));
            }
            return true;
        }

        if (isTuotuzjuWebUrl(uri)) {
            return false;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
            return true;
        } catch (ActivityNotFoundException exception) {
            Log.w(TAG, "No handler for external URL: " + uri, exception);
            return true;
        }
    }

    private boolean isTuotuzjuWebUrl(Uri uri) {
        if (!isWebUrl(uri)) {
            return false;
        }
        String host = uri.getHost();
        return host != null && (host.equals("tuotuzju.com") || host.endsWith(".tuotuzju.com"));
    }

    private Uri normalizeAppUrl(Uri uri) {
        if (isTuotuzjuDownloadUrl(uri)) {
            return Uri.parse(getString(R.string.launchUrl));
        }
        return uri;
    }

    private boolean isTuotuzjuDownloadUrl(Uri uri) {
        return isTuotuzjuWebUrl(uri) && "/download".equals(uri.getPath());
    }

    private boolean isWebUrl(Uri uri) {
        String scheme = uri.getScheme();
        return "https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode != FILE_CHOOSER_REQUEST_CODE || filePathCallback == null) {
            return;
        }

        Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        Log.i(TAG, "File chooser result count=" + (results == null ? 0 : results.length));
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (popupWebView != null) {
            if (popupWebView.canGoBack()) {
                popupWebView.goBack();
                return;
            }
            closePopupWebView();
            return;
        }

        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    private void closePopupWebView() {
        if (popupWebView == null) {
            return;
        }
        rootView.removeView(popupWebView);
        popupWebView.destroy();
        popupWebView = null;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        closePopupWebView();
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
