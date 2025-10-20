import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonChip,
  IonFab,
  IonFabButton,
  ModalController,
  LoadingController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, add, trash, camera, image, checkmark } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { ApiService } from '../../services/api.service';
import { Authentication } from '../../authentication/authentication';

interface CreatePostData {
  creatorId: string;
  creatorMail: string;
  title: string;
  description: string;
  tags: string[];
  text: string;
  payPalMail: string;
  images: string[];
}

@Component({
  selector: 'app-create-post-modal',
  templateUrl: './create-post-modal.component.html',
  styleUrls: ['./create-post-modal.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonChip,
    IonFab,
    IonFabButton
  ]
})
export class CreatePostModalComponent {
  private modalController = inject(ModalController);
  private formBuilder = inject(FormBuilder);
  private apiService = inject(ApiService);
  private authService = inject(Authentication);
  private loadingController = inject(LoadingController);
  private alertController = inject(AlertController);

  postForm: FormGroup;
  currentTag: string = '';
  tags: string[] = [];
  imageUrls: string[] = [];
  currentImageUrl: string = '';
  isSubmitting: boolean = false;

  constructor() {
    addIcons({ close, add, trash, camera, image, checkmark });

    this.postForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
      text: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
      payPalMail: ['', [Validators.email]]
    });
  }

  dismiss() {
    // Remove blur class when dismissing manually
    document.body.classList.remove('create-post-modal-open');
    this.modalController.dismiss();
  }

  addTag() {
    if (this.currentTag.trim() && !this.tags.includes(this.currentTag.trim().toLowerCase())) {
      this.tags.push(this.currentTag.trim().toLowerCase());
      this.currentTag = '';
    }
  }

  removeTag(index: number) {
    this.tags.splice(index, 1);
  }

  getTags(): string[] {
    return this.tags;
  }

  addImageUrl() {
    if (this.currentImageUrl.trim() && !this.imageUrls.includes(this.currentImageUrl.trim())) {
      this.imageUrls.push(this.currentImageUrl.trim());
      this.currentImageUrl = '';
    }
  }

  removeImageUrl(index: number) {
    this.imageUrls.splice(index, 1);
  }

  async openImageSelector() {
    // Check if running on web platform
    if (Capacitor.getPlatform() === 'web') {
      this.selectImageFromBrowser();
    } else {
      // Mobile implementation
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: true,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt, // Allows user to choose between camera or photo library
          promptLabelHeader: 'Bild auswählen',
          promptLabelPhoto: 'Aus Galerie',
          promptLabelPicture: 'Foto aufnehmen'
        });

        // image.dataUrl will contain the base64 encoded image
        if (image.dataUrl) {
          this.imageUrls.push(image.dataUrl);
        }
      } catch (error) {
        console.error('Error selecting image:', error);
        // Only show alert if user didn't cancel
        if (error !== 'User cancelled photos app') {
          await this.showAlert('Fehler', 'Bildauswahl fehlgeschlagen. Bitte versuchen Sie es erneut.');
        }
      }
    }
  }

  // Browser-specific image selection
  private selectImageFromBrowser() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;

    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
          this.showAlert('Fehler', 'Bitte wählen Sie eine Bilddatei aus.');
          return;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          this.showAlert('Fehler', 'Bild ist zu groß. Maximale Größe: 5MB');
          return;
        }

        // Read file as DataURL
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const dataUrl = e.target.result;
          this.imageUrls.push(dataUrl);
        };
        reader.onerror = () => {
          this.showAlert('Fehler', 'Bildauswahl fehlgeschlagen. Bitte versuchen Sie es erneut.');
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  }

  // Strip base64 prefix from data URL
  private stripBase64Prefix(dataUrl: string): string {
    // Remove "data:image/...;base64," prefix
    const base64Index = dataUrl.indexOf('base64,');
    if (base64Index !== -1) {
      return dataUrl.substring(base64Index + 7); // 7 = length of "base64,"
    }
    return dataUrl;
  }

  async onSubmit() {
    if (this.postForm.valid) {
      const user = this.authService.currentUser();
      if (!user) {
        await this.showAlert('Fehler', 'Sie müssen angemeldet sein, um einen Beitrag zu erstellen.');
        return;
      }

      this.isSubmitting = true;
      const loading = await this.loadingController.create({
        message: 'Beitrag wird erstellt...',
        spinner: 'crescent'
      });
      await loading.present();

      // Strip base64 prefix from images
      const base64Images = this.imageUrls.map(dataUrl => this.stripBase64Prefix(dataUrl));

      const postData: CreatePostData = {
        creatorId: user.uid,
        creatorMail: user.email || '',
        title: this.postForm.value.title,
        description: this.postForm.value.description,
        tags: this.tags,
        text: this.postForm.value.text,
        payPalMail: this.postForm.value.payPalMail?.trim() || '',
        images: base64Images
      };

      try {
        const response = await this.apiService.createPost(postData).toPromise();
        console.log('Post created successfully:', response);

        await loading.dismiss();
        // Remove blur class before dismissing
        document.body.classList.remove('create-post-modal-open');
        this.modalController.dismiss({ created: true });
      } catch (error) {
        console.error('Error creating post:', error);
        await loading.dismiss();
        await this.showAlert('Fehler', 'Beitrag konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
      } finally {
        this.isSubmitting = false;
      }
    } else {
      await this.showAlert('Validierungsfehler', 'Bitte füllen Sie alle erforderlichen Felder aus.');
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Form validation helpers
  get title() { return this.postForm.get('title'); }
  get description() { return this.postForm.get('description'); }
  get text() { return this.postForm.get('text'); }
  get payPalMail() { return this.postForm.get('payPalMail'); }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.postForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.postForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} ist erforderlich`;
      if (field.errors['minlength']) return `${fieldName} ist zu kurz`;
      if (field.errors['maxlength']) return `${fieldName} ist zu lang`;
      if (field.errors['email']) return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }
    return '';
  }
}
