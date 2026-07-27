<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JeReport extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'period_from' => 'date:Y-m-d',
            'period_to' => 'date:Y-m-d',
        ];
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(JeReceipt::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(JeItem::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
