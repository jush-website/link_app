package com.jush.remember;

import android.content.Intent;
import android.net.Uri;
import android.os.CancellationSignal;
import android.util.Base64;
import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.SecureRandom;

@CapacitorPlugin(name = "LinkGoogleAuth")
public class LinkGoogleAuthPlugin extends Plugin {
    private CancellationSignal cancellation;
    private PluginCall pending;

    @PluginMethod
    public void signIn(PluginCall call) {
        String clientId = call.getString("webClientId", "");
        if (!clientId.endsWith(".apps.googleusercontent.com")) {
            call.reject("Google 登入尚未設定。", "google/configuration");
            return;
        }
        if (pending != null) {
            call.reject("Google 登入正在進行。", "google/busy");
            return;
        }
        pending = call;
        cancellation = new CancellationSignal();
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        String nonce = Base64.encodeToString(bytes, Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING);
        GetSignInWithGoogleOption google = new GetSignInWithGoogleOption.Builder(clientId).setNonce(nonce).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(google).build();
        getActivity().runOnUiThread(() -> CredentialManager.create(getContext()).getCredentialAsync(
            getActivity(), request, cancellation, ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override public void onResult(GetCredentialResponse response) {
                    pending = null;
                    Credential credential = response.getCredential();
                    try {
                        if (!(credential instanceof CustomCredential)) throw new IllegalArgumentException("Unexpected credential");
                        GoogleIdTokenCredential googleCredential = GoogleIdTokenCredential.createFrom(credential.getData());
                        JSObject result = new JSObject();
                        result.put("idToken", googleCredential.getIdToken());
                        call.resolve(result);
                    } catch (Exception ignored) {
                        call.reject("無法取得 Google 登入憑證。", "google/configuration");
                    }
                }
                @Override public void onError(GetCredentialException error) {
                    pending = null;
                    call.reject(error instanceof GetCredentialCancellationException ? "已取消 Google 登入。" : "請確認 Android 套件與簽章的 Google 登入設定。",
                        error instanceof GetCredentialCancellationException ? "google/cancelled" : "google/configuration");
                }
            }
        ));
    }

    @PluginMethod
    public void openExternal(PluginCall call) {
        Uri uri = Uri.parse(call.getString("url", ""));
        if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) || uri.getHost() == null) {
            call.reject("網址無效。");
            return;
        }
        try {
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, uri));
            call.resolve();
        } catch (Exception ignored) {
            call.reject("無法開啟網站，請確認已安裝瀏覽器。");
        }
    }

    @Override protected void handleOnDestroy() {
        if (cancellation != null) cancellation.cancel();
        super.handleOnDestroy();
    }
}
