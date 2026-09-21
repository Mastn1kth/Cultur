import React from "react";
import { Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/ui";
import { api } from "@/lib/client";

type PresignResponse = {
  uploadUrl: string;
  photoUrl: string;
  key: string;
};

export function PhotoUploader({ onUploaded }: { onUploaded?: () => void }) {
  const [uploading, setUploading] = React.useState(false);

  async function pickAndUploadPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const info = await FileSystem.getInfoAsync(asset.uri);
      if (info.exists && info.size && info.size > 10 * 1024 * 1024) {
        Alert.alert("Файл слишком большой (макс. 10MB)");
        return;
      }

      setUploading(true);
      const processed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      const presign = await api.post<PresignResponse>("/media/presign", { contentType: "image/jpeg" });
      await FileSystem.uploadAsync(presign.data.uploadUrl, processed.uri, {
        httpMethod: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT
      });

      await api.post("/media/photos", { url: presign.data.photoUrl, key: presign.data.key });
      onUploaded?.();
    } catch (error) {
      Alert.alert(error instanceof Error ? error.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
    }
  }

  return <Button onPress={pickAndUploadPhoto}>{uploading ? "Uploading..." : "Add photo"}</Button>;
}
