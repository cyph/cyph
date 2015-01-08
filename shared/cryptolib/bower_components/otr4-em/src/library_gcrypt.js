mergeInto(LibraryManager.library, {
  i32______gpg_err_init_to_void_____:function(){},
  $BIGINT__postset:'BIGINT = globalScope["BigInt"] || require("../bigint")',
  $BIGINT: {},
  $GCRYPT__deps: ['i32______gpg_err_init_to_void_____','$BIGINT'],
  $GCRYPT__postset:
    '__ATINIT__.push({ func: function() {'+
    '  //emscripten will use crypto module/object to generate a secure random if found. \n'+
    '  //we will fail with an exception if crypto object not found. do not fallback to Math.Random! \n'+
    '   var crypto_object;'+
    '   if(typeof window !== "undefined" && typeof window.crypto !== "undefined"){'+
    '       crypto_object = window.crypto;'+
    '   }else if(typeof require !== "undefined"){'+
    '       crypto_object = require("crypto");'+
    '   }else{'+
    '       crypto_object = Module["crypto"];'+
    '   }'+
    '   if(!crypto_object) throw new Error("source of secure random data not found!");'+
    '}});',
  $GCRYPT: {},
  
  _mpi2bigint__postset: '__mpi2bigint.buffer = allocate(4096, "i8", ALLOC_STATIC);'+
                        'Module["mpi2bigint"]=__mpi2bigint;',
  _mpi2bigint__deps:['$GCRYPT','_gcry_mpi_print','_gcry_strerror'],
  _mpi2bigint: function (mpi_ptr){
     //gcry_error_t gcry_mpi_print (enum gcry_mpi_format format, unsigned char *buffer, size_t buflen, size_t *nwritten, const gcry_mpi_t a)
     var err = __gcry_mpi_print(4,__mpi2bigint.buffer,4096,0,mpi_ptr);// 4 == HEX Format
     assert(err==0,"mpi2bigint"+Pointer_stringify(__gcry_strerror(err)));
     var mpi_str = Pointer_stringify(__mpi2bigint.buffer);
     return BIGINT["str2bigInt"](mpi_str,16);
   },
   
   _bigint2mpi__postset: '__bigint2mpi.handle = allocate(1,"i32", ALLOC_STATIC);'+
                         '__bigint2mpi.buffer = allocate(4096,"i8", ALLOC_STATIC);'+
                         'Module["bigint2mpi"]=__bigint2mpi;',
   _bigint2mpi__deps: ['$GCRYPT','_gcry_mpi_scan','_gcry_strerror','_gcry_mpi_set','_gcry_mpi_release'],
   _bigint2mpi: function(mpi_ptr,bi_num){
        var bi_num_str = BIGINT["bigInt2str"](bi_num,16);
        writeStringToMemory(bi_num_str,__bigint2mpi.buffer);
        //gcry_error_t gcry_mpi_scan (gcry_mpi_t *r_mpi, enum gcry_mpi_format format, const unsigned char *buffer, size_t buflen, size_t *nscanned)
        var err = __gcry_mpi_scan(__bigint2mpi.handle,4,__bigint2mpi.buffer,0,0); //4 == HEX Format
        assert(err===0,"bigint2mpi:"+Pointer_stringify(__gcry_strerror(err)));
        var scanned_mpi_ptr = getValue(__bigint2mpi.handle,"i32");
        assert(scanned_mpi_ptr !==0, "NULL scanned mpi in bigint2mpi()");
        __gcry_mpi_set(mpi_ptr,scanned_mpi_ptr);
        __gcry_mpi_release(scanned_mpi_ptr);
   },
    
  override_gcry_mpi_powm__deps: ['$GCRYPT','_bigint2mpi','_mpi2bigint'],
  override_gcry_mpi_powm: function (mpi_w,mpi_b,mpi_e,mpi_m){
    //w = b^e mod m
    var bi_base = __mpi2bigint(mpi_b);
    var bi_expo = __mpi2bigint(mpi_e);
    var bi_mod  = __mpi2bigint(mpi_m);
    var result = BIGINT["powMod"](bi_base,bi_expo,bi_mod);
    __bigint2mpi(mpi_w,result);
  },
  
  override_gcry_mpi_mulpowm__deps: ['$GCRYPT','_bigint2mpi','_mpi2bigint'],
  override_gcry_mpi_mulpowm: function(mpi_r,mpi_array_base,mpi_array_exp,mpi_m){
    var indexer = 1;
    var mpi1, mpi2, bi_m,bi_result;
    mpi1 = getValue(mpi_array_base,"i32");
    mpi2 = getValue(mpi_array_exp,"i32");
    bi_m = __mpi2bigint(mpi_m);
    var BE = [];
    var O = [];
    while(mpi1 && mpi2){
        BE.push({"b":__mpi2bigint(mpi1),"e":__mpi2bigint(mpi2)});
        mpi1 = getValue(mpi_array_base+(indexer*4),"i32");
        mpi2 = getValue(mpi_array_exp+ (indexer*4),"i32");
        indexer++;
    }
    if(BE.length){
        BE.forEach(function(be){
            O.push(BIGINT["powMod"](be["b"],be["e"],bi_m));
        });
        bi_result = BIGINT["str2bigInt"]("1",16);
        O.forEach(function(k){
            bi_result = BIGINT["mult"](bi_result,k);
        });
    }
    bi_result = BIGINT["mod"](bi_result,bi_m);
    __bigint2mpi(mpi_r,bi_result);
  },
  
  override_gcry_mpi_invm__deps: ['$GCRYPT','_bigint2mpi','_mpi2bigint'],
  override_gcry_mpi_invm: function(mpi_x,mpi_a,mpi_m){
    // (x**(-1) mod n)
    var bi_a = __mpi2bigint(mpi_a);
    var bi_m = __mpi2bigint(mpi_m);
    var result = BIGINT["inverseMod"](bi_a,bi_m);
    if(result){
        __bigint2mpi(mpi_x,result);
        return 1;//inverse mod calculated
    }else{
        return 0;//no inverse mod exists
    }
  }
});
