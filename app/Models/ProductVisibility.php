<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVisibility extends Model
{
    protected $fillable = ['stripe_product_id', 'is_active'];
}
