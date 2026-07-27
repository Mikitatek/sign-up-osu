<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JeReceipt extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'receipt_date' => 'date:Y-m-d',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(JeReport::class, 'je_report_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(JeItem::class);
    }
}
