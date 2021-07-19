<?php 
/*
##### 업데이트로그 #####
2021.07.13 김현중 신규

**재고 등록 insert**
*/
function insert_stok_adjustment($data){
	//stok info select
	$stok_sql = 'SELECT stre_nowqty FROM stok_record WHERE stit_uid = "'.$data['stit_uid'].'" and stwa_uid = "'.$data['stwa_uid'].'" and stwara_uid = "'.$data['stwara_uid'].'" ORDER BY stre_uid DESC LIMIT 1';
	$stok_result = query($stok_sql);
	$count = mysqli_num_rows($stok_result);
	if($count > 0){ //already registered once
		$output['overlap'] = 'already';
	}else{ //new registration

//		$now_qty = mysqli_fetch_array($stok_result)['now_qty'];

		//item info select
		$item_sql = 'select stitgr_uid, stitcl_uid from stnd_item where stit_uid = "'.$data['stit_uid'].'"';
		$item_result = query($item_sql);
		$item = mysqli_fetch_array($item_result);
		$stitgr_uid = $item['stitgr_uid'];
		$stitcl_uid = $item['stitcl_uid'];

		//stok insert
		$insert_data['table'] = 'stok_record';
		$insert_data['column'] = [['stit_uid'=>$data['stit_uid'],'stitgr_uid'=>$stitgr_uid,'stitcl_uid'=>$stitcl_uid,'stwa_uid'=>$data['stwa_uid'],'stwara_uid'=>$data['stwara_uid'],'stre_inqty'=>$data['stre_nowqty'],'stre_outqty'=> 0,'stre_prevqty'=> 0 ,'stre_nowqty'=>$data['stre_nowqty'],'stre_type'=>$data['stre_type'],'stre_memuid'=>$data['login_uid'],'stre_regdate'=>$data['stre_regdate']]];
		$insert_data['pk'] = 'stre_uid';
		$output = insert_common([$insert_data]);
		$output['overlap'] = 'new';
	}
	return $output;
}
?>