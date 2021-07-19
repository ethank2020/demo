<?php 
/*
##### 업데이트로그 #####
2021.07.15 김현중 신규

**재고 조정 insert**
*/
function update_stok_adjustment($data){
	//calculate inqty and outqty
	$stre_nowqty = (int)$data['stre_nowqty'];
	$stre_prevqty = (int)$data['stre_prevqty'];
	$stre_afterqty = $stre_nowqty - $stre_prevqty;
	if($stre_afterqty > 0){
		$stre_inqty = $stre_afterqty;
		$stre_outqty = 0;
	}else{
		$stre_inqty = 0;
		$stre_outqty = -$stre_afterqty;
	}

	//stok insert
	$insert_data['table'] = 'stok_record';
	$insert_data['column'] = [['stit_uid'=>$data['stit_uid'],'stitgr_uid'=>$data['stitgr_uid'],'stitcl_uid'=>$data['stitcl_uid'],'stwa_uid'=>$data['stwa_uid'],'stwara_uid'=>$data['stwara_uid'],'stre_inqty'=>$stre_inqty,'stre_outqty'=> $stre_outqty,'stre_prevqty'=> $data['stre_prevqty'] ,'stre_nowqty'=>$data['stre_nowqty'],'stre_type'=>$data['stre_type'],'stre_memuid'=>$data['login_uid'],'stre_regdate'=>$data['stre_regdate']]];
	$insert_data['pk'] = 'stre_uid';
	$output = insert_common([$insert_data]);
	return $output;
}
?>