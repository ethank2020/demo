<?php 
/*
##### 업데이트로그 #####
2021.07.15 김현중 신규

**창고 이동 insert**
*/
function update_stok_warehouse($data){
	if($data['stwara_uid'] == ''){ //set 0 to empty In-rack [REAL DATA TO INSERT]
		$data['stwara_uid'] = 0;
	}

	//*************************************************EXPORT START******************************************************//
	//Ex data
	$exprev_qty = (int)$data['stre_prevqty']; // prevqty[Ex-warehouse]
	$exout_qty = (int)$data['stre_nowqty']; // outqty[Ex-warehouse]
	$exnow_qty = $exprev_qty - $exout_qty; // nowqty[Ex-warehouse]
	$exin_qty = 0; // inqty[Ex-warehouse]

	//Ex insert
	$insert_data['table'] = 'stok_record';
	$insert_data['column'] = [['stit_uid'=>$data['stit_uid'],'stitgr_uid'=>$data['stitgr_uid'],'stitcl_uid'=>$data['stitcl_uid'],'stwa_uid'=>$data['stwa_oriuid'],'stwara_uid'=>$data['stwara_oriuid'],'stre_inqty'=>$exin_qty,'stre_outqty'=> $exout_qty,'stre_prevqty'=> $exprev_qty ,'stre_nowqty'=>$exnow_qty,'stre_type'=>$data['stre_type'].'(출)','stre_memuid'=>$data['login_uid'],'stre_regdate'=>'']];
	$insert_data['pk'] = 'stre_uid';
	$outputEx = insert_common([$insert_data]);

	//*************************************************INCOME START******************************************************//
	if($outputEx['result'] == 'success'){ //In after Ex succeed
		//In data
		$stok_sql = 'SELECT stre_nowqty FROM stok_record WHERE stit_uid = "'.$data['stit_uid'].'" and stwa_uid = "'.$data['stwa_uid'].'" and stwara_uid = "'.$data['stwara_uid'].'" ORDER BY stre_uid DESC LIMIT 1';
		$stok_result = query($stok_sql);
		$inprev_qty = mysqli_fetch_array($stok_result)['stre_nowqty']; //prevqty[In-warehouse]
		if(!$inprev_qty){ //set 0 to null
			$inprev_qty = 0;
		}
		$innow_qty = (int)$inprev_qty + $exout_qty; //inqty[In-warehouse]
		$inout_qty = 0; //outqty[In-warehouse]
		$inin_qty = $exout_qty; //inqty[In-warehouse]

		//In insert
		$insert_data['table'] = 'stok_record';
		$insert_data['column'] = [['stit_uid'=>$data['stit_uid'],'stitgr_uid'=>$data['stitgr_uid'],'stitcl_uid'=>$data['stitcl_uid'],'stwa_uid'=>$data['stwa_uid'],'stwara_uid'=>$data['stwara_uid'],'stre_inqty'=>$inin_qty,'stre_outqty'=> $inout_qty,'stre_prevqty'=> $inprev_qty ,'stre_nowqty'=>$innow_qty,'stre_type'=>$data['stre_type'].'(입)','stre_memuid'=>$data['login_uid'],'stre_regdate'=>'']];
		$insert_data['pk'] = 'stre_uid';
		$outputIn = insert_common([$insert_data]);
	}
	$output['export'] = $outputEx;
	$output['income'] = $outputIn;
	return $output;
}
?>