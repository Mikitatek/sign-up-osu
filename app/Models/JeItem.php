<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JeItem extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(JeReceipt::class, 'je_receipt_id');
    }
}
