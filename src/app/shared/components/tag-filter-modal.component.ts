import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonCheckbox,
  IonFab,
  IonFabButton,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, checkmark, pricetagOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tag-filter-modal',
  templateUrl: './tag-filter-modal.component.html',
  styleUrls: ['./tag-filter-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonCheckbox,
    IonFab,
    IonFabButton
  ]
})
export class TagFilterModalComponent implements OnInit {
  @Input() availableTags: string[] = [];
  @Input() selectedTags: Set<string> = new Set();

  private modalController = inject(ModalController);

  // Local copy for manipulation
  localSelectedTags: Set<string> = new Set();

  constructor() {
    addIcons({ close, checkmark, pricetagOutline });
  }

  ngOnInit() {
    // Create a copy of the selected tags
    this.localSelectedTags = new Set(this.selectedTags);
  }

  isTagSelected(tag: string): boolean {
    return this.localSelectedTags.has(tag);
  }

  toggleTag(tag: string) {
    if (this.localSelectedTags.has(tag)) {
      this.localSelectedTags.delete(tag);
    } else {
      this.localSelectedTags.add(tag);
    }
  }

  clearAll() {
    this.localSelectedTags.clear();
  }

  apply() {
    this.modalController.dismiss({
      selectedTags: Array.from(this.localSelectedTags)
    });
  }

  cancel() {
    this.modalController.dismiss();
  }

  get selectedCount(): number {
    return this.localSelectedTags.size;
  }
}
