import { Component, OnInit, Input, inject } from '@angular/core';
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
import { AdminService } from '../../services/admin.service';
import { BazzarItem } from '../../models/bazzar.interface';

interface UpdatePostData {
  creatorId: string;
  creatorMail: string;
  title: string;
  description: string;
  tags: string[];
  text: string;
  payPalMail: string;
  images: string[];
  comments: any[];
  IsTerminated: boolean;  // Backend expects PascalCase
  acceptanceList: any[];
  acceptedUser: any;
}

@Component({
  selector: 'app-edit-post-modal',
  templateUrl: './edit-post-modal.component.html',
  styleUrls: ['./edit-post-modal.component.scss'],
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
export class EditPostModalComponent implements OnInit {
  @Input() post!: BazzarItem;

  private modalController = inject(ModalController);
  private formBuilder = inject(FormBuilder);
  private apiService = inject(ApiService);
  private authService = inject(Authentication);
  private adminService = inject(AdminService);
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

  ngOnInit() {
    // Pre-fill form with existing post data
    if (this.post) {
      this.postForm.patchValue({
        title: this.post.title,
        description: this.post.description,
        text: this.post.text,
        payPalMail: this.post.payPalMail || ''
      });

      // Pre-fill tags
      this.tags = [...(this.post.tags || [])];

      // Pre-fill images
      this.imageUrls = [...(this.post.images || [])];
    }
  }

  dismiss() {
    // Remove blur class when dismissing manually
    document.body.classList.remove('edit-post-modal-open');
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
          source: CameraSource.Prompt,
          promptLabelHeader: 'Bild auswählen',
          promptLabelPhoto: 'Aus Galerie',
          promptLabelPicture: 'Foto aufnehmen'
        });

        if (image.dataUrl) {
          this.imageUrls.push(image.dataUrl);
        }
      } catch (error) {
        console.error('Error selecting image:', error);
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
        if (!file.type.startsWith('image/')) {
          this.showAlert('Fehler', 'Bitte wählen Sie eine Bilddatei aus.');
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          this.showAlert('Fehler', 'Bild ist zu groß. Maximale Größe: 5MB');
          return;
        }

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
    const base64Index = dataUrl.indexOf('base64,');
    if (base64Index !== -1) {
      return dataUrl.substring(base64Index + 7);
    }
    return dataUrl;
  }

  async onSubmit() {
    if (this.postForm.valid && this.post) {
      const user = this.authService.currentUser();
      if (!user) {
        await this.showAlert('Fehler', 'Sie müssen angemeldet sein, um einen Beitrag zu bearbeiten.');
        return;
      }

      // Verify user has permission (creator or admin)
      if (!this.adminService.canEditContent(this.post.creatorId)) {
        await this.showAlert('Fehler', 'Sie haben keine Berechtigung, diesen Beitrag zu bearbeiten.');
        return;
      }

      this.isSubmitting = true;
      const loading = await this.loadingController.create({
        message: 'Beitrag wird aktualisiert...',
        spinner: 'crescent'
      });
      await loading.present();

      // Strip base64 prefix from images
      const base64Images = this.imageUrls.map(dataUrl => this.stripBase64Prefix(dataUrl));

      const payPalMailValue = this.postForm.value.payPalMail?.trim() || '';

      const postData: UpdatePostData = {
        creatorId: user.uid,
        creatorMail: user.email || '',
        title: this.postForm.value.title,
        description: this.postForm.value.description,
        tags: this.tags,
        text: this.postForm.value.text,
        payPalMail: payPalMailValue,
        images: base64Images,
        // Preserve existing acceptance data
        comments: this.post.comments || [],
        IsTerminated: this.post.isTerminated || false,  // Backend expects PascalCase
        acceptanceList: this.post.acceptanceList || [],
        acceptedUser: this.post.acceptedUser || {}
      };

      console.log('Updating post with data:', {
        ...postData,
        images: `[${postData.images.length} images]`,
        payPalMail: `"${postData.payPalMail}"`,
        payPalMailLength: postData.payPalMail.length,
        payPalMailIsEmpty: postData.payPalMail === ''
      });

      try {
        await this.apiService.updatePost(this.post.creatorId, this.post.id, postData).toPromise();
        console.log('Post updated successfully');

        await loading.dismiss();
        // Remove blur class before dismissing
        document.body.classList.remove('edit-post-modal-open');
        this.modalController.dismiss({ updated: true });
      } catch (error) {
        console.error('Error updating post:', error);
        await loading.dismiss();
        await this.showAlert('Fehler', 'Beitrag konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.');
      } finally {
        this.isSubmitting = false;
      }
    } else {
      await this.showAlert('Validierungsfehler', 'Bitte füllen Sie alle erforderlichen Felder aus.');
    }
  }

  async onDelete() {
    const user = this.authService.currentUser();
    if (!user || !this.post) {
      await this.showAlert('Fehler', 'Sie müssen angemeldet sein, um einen Beitrag zu löschen.');
      return;
    }

    // Verify user has permission (creator or admin)
    if (!this.adminService.canDeleteContent(this.post.creatorId)) {
      await this.showAlert('Fehler', 'Sie haben keine Berechtigung, diesen Beitrag zu löschen.');
      return;
    }

    // Show confirmation dialog
    const alert = await this.alertController.create({
      header: 'Beitrag löschen',
      message: 'Möchten Sie diesen Beitrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel'
        },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Beitrag wird gelöscht...',
              spinner: 'crescent'
            });
            await loading.present();

            try {
              await this.apiService.deletePost(this.post.creatorId, this.post.id).toPromise();
              console.log('Post deleted successfully');

              await loading.dismiss();
              // Remove blur class before dismissing
              document.body.classList.remove('edit-post-modal-open');
              this.modalController.dismiss({ deleted: true });
            } catch (error) {
              console.error('Error deleting post:', error);
              await loading.dismiss();
              await this.showAlert('Fehler', 'Beitrag konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.');
            }
          }
        }
      ]
    });

    await alert.present();
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
